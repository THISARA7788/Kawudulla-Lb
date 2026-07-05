// =========================================================================
// WHAT DOES THIS FILE DO?
// This endpoint parses scans/text inputs. It checks prefixes to find:
// - Member Profiles: if input begins with 'KMV-' (case-insensitive)
// - Book Records: if input begins with 'BK' (case-insensitive)
// Returns complete metadata records, active borrows, and totals.
// =========================================================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Book = require('../models/Book');
const Transaction = require('../models/Transaction');

// All protected
router.use(protect);

// GET /api/library/quick-lookup/:id
router.get('/quick-lookup/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const trimmed = id.trim();

    // 1. Try to find user by memberId (case-insensitive)
    const user = await User.findOne({ memberId: trimmed.toUpperCase() }, '-password -borrowedBooks -resetToken -resetTokenExpiry');
    
    if (user) {
      const Fine = require('../models/Fine');
      const populatedUser = await User.findById(user._id, '-password -borrowedBooks -resetToken -resetTokenExpiry')
        .populate('borrowedBooks.book', 'bookId title author');
        
      const activeBorrows = await Transaction.find({ user: user._id, status: 'active' })
        .populate('book', 'bookId title author')
        .sort({ issueDate: -1 })
        .limit(10);

      const totalBorrows = await Transaction.countDocuments({ user: user._id });
      
      const activeFines = await Fine.find({ user: user._id, status: 'unpaid' })
        .populate('book', 'bookId title author')
        .populate('transaction', 'transactionId dueDate');

      return res.json({
        type: 'member',
        member: populatedUser,
        activeBorrows,
        totalBorrows,
        activeFines,
      });
    }

    // 2. Try to find book by bookId or isbn (handling spaces and hyphens)
    const isbnCleaned = trimmed.replace(/[-\s]/g, '');
    const book = await Book.findOne({
      $or: [
        { bookId: trimmed.toUpperCase() },
        { isbn: trimmed },
        { isbn: isbnCleaned }
      ]
    });

    if (book) {
      const activeTransactions = await Transaction.find({ book: book._id, status: { $in: ['active', 'overdue'] } })
        .populate('user', 'name email memberId grade class role');

      return res.json({
        type: 'book',
        book,
        activeTransactions: activeTransactions || []
      });
    }

    return res.status(404).json({ message: `No member or book found with ID/ISBN "${trimmed}"` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
