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

    // Determine lookup type by prefix
    const isMemberId = trimmed.toUpperCase().startsWith('KMV-');
    const isBookId = trimmed.toUpperCase().startsWith('BK');

    if (isMemberId) {
      const Fine = require('../models/Fine');
      const user = await User.findOne({ memberId: trimmed.toUpperCase() }, '-password -borrowedBooks -resetToken -resetTokenExpiry')
        .populate('borrowedBooks.book', 'bookId title author');
      if (!user) return res.status(404).json({ message: 'Member not found' });

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
        member: user,
        activeBorrows,
        totalBorrows,
        activeFines,
      });
    }

    if (isBookId) {
      const book = await Book.findOne({ bookId: trimmed.toUpperCase() });
      if (!book) return res.status(404).json({ message: 'Book not found' });
      return res.json({ type: 'book', book });
    }

    return res.status(400).json({ message: 'Invalid ID format. Use KMV-XXXX for members or BKXXX for books' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
