const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Book = require('../models/Book');
const Fine = require('../models/Fine');

// All routes require librarian role
router.use(protect, authorize('librarian'));

// GET /api/library/reports/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments();
    const totalMembers = await User.countDocuments({ status: 'active' });
    const totalTransactions = await Transaction.countDocuments();
    const activeBorrows = await Transaction.countDocuments({ status: 'active' });
    const overdueCount = await Transaction.countDocuments({ status: 'overdue' });
    const pendingRegistrations = await User.countDocuments({ status: 'pending' });

    const availableBooks = await Book.aggregate([{ $group: { _id: null, total: { $sum: '$availableCopies' } } }]);
    const finesUnpaid = await Fine.aggregate([{ $match: { status: 'unpaid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);

    res.json({
      totalBooks,
      totalMembers,
      totalTransactions,
      activeBorrows,
      overdueCount,
      pendingRegistrations,
      availableCopies: availableBooks[0]?.total || 0,
      unpaidFines: finesUnpaid[0]?.total || 0,
    });
  } catch (err) {
    console.error('Reports operation error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/library/reports/circulation
router.get('/circulation', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    if (startDate || endDate) {
      query.$or = [];
      if (startDate) query.$or.push({ issueDate: { $gte: new Date(startDate) } });
      if (endDate) query.$or.push({ issueDate: { $lte: new Date(endDate + 'T23:59:59') } });
    }

    const transactions = await Transaction.find(query)
      .populate('user', 'memberId name email role')
      .populate('book', 'bookId title author')
      .populate('issuedBy', 'name')
      .sort({ issueDate: -1 });

    const issued = transactions.length;
    const returned = transactions.filter((t) => t.status === 'returned').length;
    const overdue = transactions.filter((t) => t.status === 'overdue' || (t.status === 'active' && new Date(t.dueDate) < new Date())).length;
    const active = transactions.filter((t) => t.status === 'active').length;

    res.json({ transactions, summary: { issued, returned, overdue, active } });
  } catch (err) {
    console.error('Reports operation error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/library/reports/members
router.get('/members', async (req, res) => {
  try {
    const { startDate, endDate, role } = req.query;
    const query = { status: 'active' };
    if (role && role !== 'all') query.role = role;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate + 'T23:59:59');

    const txnMatch = Object.keys(dateFilter).length ? { issueDate: dateFilter } : {};

    const members = await User.find(query, 'memberId name email role grade status borrowCount')
      .sort({ createdAt: -1 });

    // Enrich with borrow counts
    const enriched = await Promise.all(
      members.map(async (m) => {
        const activeCount = await Transaction.countDocuments({ user: m._id, status: 'active' });
        const totalBorrows = await Transaction.countDocuments({ user: m._id, ...(Object.keys(txnMatch).length ? txnMatch : {}) });
        const totalFines = await Fine.aggregate([
          { $match: { user: m._id } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        return {
          ...m.toObject(),
          activeBorrows: activeCount,
          totalBorrows,
          totalFines: totalFines[0]?.total || 0,
        };
      })
    );

    res.json({ members: enriched, total: enriched.length });
  } catch (err) {
    console.error('Reports operation error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/library/reports/popular-books
router.get('/popular-books', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popular = await Transaction.aggregate([
      { $group: { _id: '$book', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: Number(limit) },
      { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
      { $unwind: '$book' },
      { $project: { book: 1, count: 1 } },
    ]);

    const leastPopular = await Book.aggregate([
      {
        $lookup: {
          from: 'transactions',
          localField: '_id',
          foreignField: 'book',
          as: 'txns',
        },
      },
      { $project: { book: '$$ROOT', count: { $size: '$txns' } } },
      { $sort: { count: 1 } },
      { $limit: Number(limit) },
      { $replaceRoot: { newRoot: '$book' } },
    ]);

    // Category stats
    const categories = await Book.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ popular, leastPopular, categories });
  } catch (err) {
    console.error('Reports operation error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/library/reports/fines
router.get('/fines', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59');
    }

    const fines = await Fine.find(query)
      .populate('user', 'memberId name email role')
      .populate('book', 'bookId title author')
      .populate('transaction', 'transactionId')
      .sort({ createdAt: -1 });

    const totalCollected = fines.filter((f) => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
    const totalOutstanding = fines.filter((f) => f.status === 'unpaid').reduce((sum, f) => sum + f.amount, 0);
    const totalWaived = fines.filter((f) => f.status === 'waived').reduce((sum, f) => sum + f.amount, 0);

    res.json({
      fines,
      summary: {
        totalCollected,
        totalOutstanding,
        totalWaived,
        count: fines.length,
      },
    });
  } catch (err) {
    console.error('Reports operation error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
