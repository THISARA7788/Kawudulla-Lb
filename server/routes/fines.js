const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Fine = require('../models/Fine');
const FineConfig = require('../models/FineConfig');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Book = require('../models/Book');

// All routes require librarian role
router.use(protect, authorize('librarian'));

// GET /api/library/fines/config
router.get('/config', async (req, res) => {
  try {
    let config = await FineConfig.findOne();
    if (!config) {
      config = await FineConfig.create({ fineRatePerDay: 10, gracePeriodDays: 0 });
    }
    res.json({ config });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/library/fines/config
router.put('/config', async (req, res) => {
  try {
    let config = await FineConfig.findOne();
    if (!config) {
      config = await FineConfig.create(req.body);
    } else {
      if (req.body.fineRatePerDay !== undefined) config.fineRatePerDay = Number(req.body.fineRatePerDay);
      if (req.body.gracePeriodDays !== undefined) config.gracePeriodDays = Number(req.body.gracePeriodDays);
      await config.save();
    }
    res.json({ config });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/library/fines/stats
router.get('/stats', async (req, res) => {
  try {
    const unpaid = await Fine.aggregate([{ $match: { status: 'unpaid' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]);
    const paid = await Fine.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]);
    const waived = await Fine.aggregate([{ $match: { status: 'waived' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]);
    res.json({
      unpaidTotal: unpaid[0]?.total || 0,
      unpaidCount: unpaid[0]?.count || 0,
      paidTotal: paid[0]?.total || 0,
      paidCount: paid[0]?.count || 0,
      waivedTotal: waived[0]?.total || 0,
      waivedCount: waived[0]?.count || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/library/fines/pending - find overdue transactions without fines
router.get('/pending', async (req, res) => {
  try {
    const config = await FineConfig.findOne() || { fineRatePerDay: 10, gracePeriodDays: 0 };
    const now = new Date();

    const overdueTransactions = await Transaction.find({
      status: { $in: ['active', 'overdue'] },
      returnDate: null,
    })
      .populate('user', 'memberId name email role')
      .populate('book', 'bookId title author')
      .populate('issuedBy', 'name');

    const existingFineTxIds = new Set(
      (await Fine.find({ status: 'unpaid' }, 'transaction')).map((f) => f.transaction.toString())
    );

    const pendingFines = [];
    for (const tx of overdueTransactions) {
      const dueDate = new Date(tx.dueDate);
      const graceEnd = new Date(dueDate.getTime() + config.gracePeriodDays * 86400000);
      if (now <= graceEnd) continue;

      const daysOverdue = Math.ceil((now - graceEnd) / 86400000);
      const amount = daysOverdue * config.fineRatePerDay;

      pendingFines.push({
        transaction: tx,
        hasExistingFine: existingFineTxIds.has(tx._id.toString()),
        daysOverdue,
        ratePerDay: config.fineRatePerDay,
        amount,
      });
    }

    res.json({ pendingFines, config });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/library/fines - create fine for a transaction
router.post('/', async (req, res) => {
  try {
    const { transactionId, amount, daysOverdue, ratePerDay, notes } = req.body;

    const tx = await Transaction.findById(transactionId);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });

    const existing = await Fine.findOne({ transaction: transactionId, status: 'unpaid' });
    if (existing) return res.status(400).json({ message: 'Fine already exists for this transaction' });

    const fine = await Fine.create({
      transaction: tx._id,
      user: tx.user,
      book: tx.book,
      amount: Number(amount) || 0,
      daysOverdue: Number(daysOverdue) || 0,
      ratePerDay: Number(ratePerDay) || 0,
      notes: notes || '',
    });

    const populated = await Fine.findById(fine._id)
      .populate('user', 'memberId name email role')
      .populate('book', 'bookId title author');

    res.status(201).json({ fine: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/library/fines
router.get('/', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const fines = await Fine.find(query)
      .populate('user', 'memberId name email role')
      .populate('book', 'bookId title author')
      .populate('transaction', 'transactionId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Fine.countDocuments(query);

    let filtered = fines;
    if (search) {
      const q = search.toLowerCase();
      filtered = fines.filter(
        (f) =>
          (f.user && (f.user.name?.toLowerCase().includes(q) || f.user.memberId?.toLowerCase().includes(q))) ||
          (f.book && (f.book.title?.toLowerCase().includes(q) || f.book.bookId?.toLowerCase().includes(q))) ||
          (f.transaction && f.transaction.transactionId?.toLowerCase().includes(q))
      );
    }

    res.json({
      fines: filtered,
      total: filtered.length,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/library/fines/:id/pay
router.put('/:id/pay', async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id);
    if (!fine) return res.status(404).json({ message: 'Fine not found' });
    fine.status = 'paid';
    fine.paidAt = new Date();
    if (req.body.notes) fine.notes += (fine.notes ? ' | ' : '') + req.body.notes;
    await fine.save();
    res.json({ fine });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/library/fines/:id/waive
router.put('/:id/waive', async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id);
    if (!fine) return res.status(404).json({ message: 'Fine not found' });
    fine.status = 'waived';
    fine.waivedReason = req.body.reason || '';
    await fine.save();
    res.json({ fine });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/library/fines/:id
router.delete('/:id', async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id);
    if (!fine) return res.status(404).json({ message: 'Fine not found' });
    await fine.deleteOne();
    res.json({ message: 'Fine deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
