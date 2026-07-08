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
    
    const now = new Date();
    // Overdue: status is not returned and dueDate is in the past
    const overdueCount = await Transaction.countDocuments({
      status: { $ne: 'returned' },
      dueDate: { $lt: now }
    });

    // Currently Borrowed: all active and overdue/unreturned checkouts
    const currentlyBorrowed = await Transaction.countDocuments({
      status: { $ne: 'returned' }
    });

    const pendingRegistrations = await User.countDocuments({ status: 'pending' });

    const availableBooks = await Book.aggregate([{ $group: { _id: null, total: { $sum: '$availableCopies' } } }]);
    const totalCopies = await Book.aggregate([{ $group: { _id: null, total: { $sum: '$totalCopies' } } }]);
    const finesUnpaid = await Fine.aggregate([{ $match: { status: 'unpaid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);

    // Calculate fines due today (unpaid fines created today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const finesToday = await Fine.aggregate([
      { $match: { status: 'unpaid', createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Calculate fines due this month (unpaid fines created this month)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const finesMonth = await Fine.aggregate([
      { $match: { status: 'unpaid', createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Calculate category breakdown directly on MongoDB server using aggregation (extremely fast)
    const categoriesMap = {};
    const categoriesData = await Book.aggregate([
      { $group: { _id: '$category', count: { $sum: '$availableCopies' } } }
    ]);
    categoriesData.forEach(c => {
      const catName = c._id && c._id.trim() ? c._id.trim() : 'Uncategorized';
      categoriesMap[catName] = c.count;
    });

    // Fetch the top 3 most recently added books directly, requesting only needed fields
    const recentBooks = await Book.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select('title author category coverImageUrl availableCopies totalCopies createdAt');

    res.json({
      totalBooks,
      totalCopies: totalCopies[0]?.total || 0,
      totalMembers,
      totalTransactions,
      currentlyBorrowed,
      overdueCount,
      pendingRegistrations,
      availableCopies: availableBooks[0]?.total || 0,
      unpaidFines: finesUnpaid[0]?.total || 0,
      finesDueToday: finesToday[0]?.total || 0,
      finesDueThisMonth: finesMonth[0]?.total || 0,
      categoriesMap,
      recentBooks,
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
    const now = new Date();

    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate + 'T23:59:59');
    }

    const transactions = await Transaction.find(query)
      .populate('user', 'memberId name email role')
      .populate('book', 'bookId title author')
      .populate('issuedBy', 'name')
      .sort({ updatedAt: -1 }); // Sort by most recent activity (issue or return)

    // Format transactions and calculate accurate, non-overlapping summary
    let issued = 0;
    let returned = 0;
    let overdue = 0;
    let active = 0;

    const formattedTransactions = transactions.map(t => {
      const doc = t.toObject();
      const isReturned = doc.status === 'returned';
      const isOverdue = !isReturned && (doc.status === 'overdue' || new Date(doc.dueDate) < now);
      const isActive = !isReturned && !isOverdue;

      if (isReturned) returned++;
      else if (isOverdue) overdue++;
      else if (isActive) active++;

      issued++; // All transactions in this query are "issued"

      // Ensure status is explicitly tagged for the frontend
      if (isOverdue && doc.status !== 'returned') {
        doc.status = 'overdue';
      }

      return doc;
    });

    res.json({ transactions: formattedTransactions, summary: { issued, returned, overdue, active } });
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
