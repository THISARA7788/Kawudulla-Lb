const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Book = require('../models/Book');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const BORROW_LIMIT = { student: 5, teacher: 10, librarian: 1 };

// ===========================
// BOOK ROUTES
// ===========================

// GET /api/library/books - All logged-in users can view books
router.get('/books', protect, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { author: { $regex: search, $options: 'i' } },
          { isbn: { $regex: search, $options: 'i' } },
          { bookId: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
        ],
      };
    }
    const books = await Book.find(query).sort({ createdAt: -1 });
    res.json({ books, count: books.length });
  } catch (error) {
    console.error('Get books error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/library/books/:id - View a single book
router.get('/books/:id', protect, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(book);
  } catch (error) {
    console.error('Get book error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/library/books - Only librarian can add a new book
router.post('/books', protect, authorize('librarian'), async (req, res) => {
  try {
    const { title, author, isbn, category, description, totalCopies, publisher, publishedYear } = req.body;
    if (!title || !author || !category) {
      return res.status(400).json({ message: 'Title, author, and category are required' });
    }
    const book = await Book.create({
      title, author, isbn, category, description,
      totalCopies: totalCopies || 1,
      availableCopies: totalCopies || 1,
      publisher, publishedYear,
    });
    res.status(201).json({ message: 'Book added successfully', book });
  } catch (error) {
    console.error('Add book error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/library/books/:id - Only librarian can edit a book
router.put('/books/:id', protect, authorize('librarian'), async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    Object.assign(book, req.body);
    await book.save();
    res.json({ message: 'Book updated', book });
  } catch (error) {
    console.error('Update book error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/library/books/:id - Only librarian can delete a book
router.delete('/books/:id', protect, authorize('librarian'), async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    await book.deleteOne();
    res.json({ message: 'Book deleted' });
  } catch (error) {
    console.error('Delete book error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================
// BORROW ROUTES
// ===========================

// GET /api/library/borrowed - All roles can view their own borrowed books
router.get('/borrowed', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('borrowedBooks.book', 'title author isbn category');
    const borrowedBooks = user.borrowedBooks || [];
    res.json({ borrowedBooks, count: borrowedBooks.length });
  } catch (error) {
    console.error('Get borrowed error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/library/borrow/:bookId - All roles can borrow a book
router.post('/borrow/:bookId', protect, async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    if (book.availableCopies <= 0) {
      return res.status(400).json({ message: 'No copies available for borrowing' });
    }

    const user = await User.findById(req.user._id);
    if (!user.borrowedBooks) user.borrowedBooks = [];

    const alreadyBorrowed = user.borrowedBooks.some(b => b.book.toString() === req.params.bookId && !b.returnDate);
    if (alreadyBorrowed) {
      return res.status(400).json({ message: 'You already have this book borrowed' });
    }

    book.availableCopies -= 1;
    await book.save();

    user.borrowedBooks.push({
      book: book._id,
      borrowDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });
    await user.save();

    // Notify user
    const { createNotification } = require('../notificationsHelper');
    await createNotification({
      recipient: req.user._id,
      type: 'book_borrowed',
      message: `You borrowed "${book.title}"`,
      relatedBook: book._id,
    });

    res.json({ message: 'Book borrowed successfully', book });
  } catch (error) {
    console.error('Borrow book error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================
// ISSUE / RETURN ROUTES (Librarian)
// ===========================

// POST /api/library/issue - Librarian issues a book to a specific user
router.post('/issue', protect, authorize('librarian'), async (req, res) => {
  try {
    const { userId, bookId, issueDate, dueDate, notes } = req.body;

    if (!userId || !bookId || !dueDate) {
      return res.status(400).json({ message: 'userId, bookId, and dueDate are required' });
    }

    // Check user exists
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check borrowing limit
    const activeCount = user.borrowedBooks ? user.borrowedBooks.filter(b => !b.returnDate).length : 0;
    const limit = BORROW_LIMIT[user.role] || 5;
    if (activeCount >= limit) {
      return res.status(400).json({ message: `${user.name} has reached the borrowing limit (${limit} books)` });
    }

    // Check book availability
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    if (book.availableCopies <= 0) {
      return res.status(400).json({ message: 'No copies available' });
    }

    // Check if user already has this book
    const alreadyBorrowed = user.borrowedBooks && user.borrowedBooks.some(b => b.book.toString() === bookId && !b.returnDate);
    if (alreadyBorrowed) {
      return res.status(400).json({ message: `${user.name} already has "${book.title}" borrowed` });
    }

    // Decrement available copies
    book.availableCopies -= 1;
    await book.save();

    // Add to user's borrowed books
    const normalizedIssueDate = issueDate ? new Date(issueDate) : new Date();
    const normalizedDueDate = new Date(dueDate);

    user.borrowedBooks.push({
      book: bookId,
      borrowDate: normalizedIssueDate,
      dueDate: normalizedDueDate,
    });
    await user.save();

    // Create transaction record
    const transaction = await Transaction.create({
      user: userId,
      book: bookId,
      issueDate: normalizedIssueDate,
      dueDate: normalizedDueDate,
      notes: notes || '',
      issuedBy: req.user._id,
    });

    // Notify user and librarian
    const { createNotification } = require('../notificationsHelper');
    await Promise.all([
      createNotification({
        recipient: userId,
        type: 'book_borrowed',
        message: `You borrowed "${book.title}" (library staff: ${req.user.name})`,
        relatedBook: book._id,
        relatedTransaction: transaction._id,
      }),
      createNotification({
        recipient: req.user._id,
        type: 'book_borrowed',
        message: `Issued "${book.title}" to ${user.name}`,
        relatedBook: book._id,
        relatedTransaction: transaction._id,
      }),
    ]);

    // Populate for response
    await user.populate('borrowedBooks.book', 'title author isbn category bookId');

    res.status(201).json({
      message: 'Book issued successfully',
      transaction,
      user,
      book,
    });
  } catch (error) {
    console.error('Issue book error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/library/return - Librarian receives a returned book
router.post('/return', protect, authorize('librarian'), async (req, res) => {
  try {
    const { userId, bookId, returnDate } = req.body;

    if (!userId || !bookId) {
      return res.status(400).json({ message: 'userId and bookId are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const borrowEntry = user.borrowedBooks.find(b => b.book.toString() === bookId && !b.returnDate);
    if (!borrowEntry) {
      return res.status(400).json({ message: 'No active borrowing found for this book' });
    }

    const normalizedReturnDate = returnDate ? new Date(returnDate) : new Date();
    borrowEntry.returnDate = normalizedReturnDate;
    await user.save();

    // Increment available copies
    const book = await Book.findByIdAndUpdate(bookId, { $inc: { availableCopies: 1 } }, { new: true });

    // Find and update transaction
    const transaction = await Transaction.findOneAndUpdate(
      { user: userId, book: bookId, status: 'active' },
      { returnDate: normalizedReturnDate, status: 'returned' },
      { new: true }
    );

    // Notify user and librarian about return
    const { createNotification } = require('../notificationsHelper');
    await Promise.all([
      createNotification({
        recipient: userId,
        type: 'book_returned',
        message: `"${book.title}" returned successfully`,
        relatedBook: book._id,
        relatedTransaction: transaction._id,
      }),
      createNotification({
        recipient: req.user._id,
        type: 'book_returned',
        message: `"${book.title}" returned by ${user.name}`,
        relatedBook: book._id,
        relatedTransaction: transaction._id,
      }),
    ]);

    // Populate for response
    await user.populate('borrowedBooks.book', 'title author isbn category bookId');

    res.json({
      message: 'Book returned successfully',
      transaction,
      user,
      book,
    });
  } catch (error) {
    console.error('Return book error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/library/transactions - Get all circulation records
router.get('/transactions', protect, async (req, res) => {
  try {
    const { userId, status, page = 1, limit = 20 } = req.query;
    let query = {};

    if (userId) query.user = userId;
    if (status && status !== 'all') query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email role memberId grade')
      .populate('book', 'title author isbn bookId category')
      .populate('issuedBy', 'name');

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      count: transactions.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Get transactions error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/library/users/:id/borrowing-info - Get user's borrowing info
router.get('/users/:id/borrowing-info', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('borrowedBooks.book', 'title author isbn bookId category')
      .select('name email role borrowedBooks grade class');

    if (!user) return res.status(404).json({ message: 'User not found' });

    const activeBorrows = (user.borrowedBooks || []).filter(b => !b.returnDate);
    const overdueBorrows = activeBorrows.filter(b => new Date(b.dueDate) < new Date());
    const limit = BORROW_LIMIT[user.role] || 5;

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        grade: user.grade,
        class: user.class,
      },
      activeCount: activeBorrows.length,
      overdueCount: overdueBorrows.length,
      limit,
      borrowedBooks: activeBorrows,
      allBorrows: user.borrowedBooks,
    });
  } catch (error) {
    console.error('Get borrowing info error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/library/users/:id/history - Get full member history (transactions + current borrows)
router.get('/users/:id/history', protect, authorize('librarian'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email role memberId grade class status');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Get all transactions for this user
    const transactions = await Transaction.find({ user: req.params.id })
      .sort({ issueDate: -1 })
      .populate('book', 'title author isbn bookId category')
      .populate('issuedBy', 'name');

    // Calculate stats
    const totalBorrows = transactions.length;
    const currentBorrows = transactions.filter(t => t.status === 'active').length;
    const returnedCount = transactions.filter(t => t.status === 'returned').length;
    const overdueCount = transactions.filter(t => t.status === 'active' && new Date(t.dueDate) < new Date()).length;

    res.json({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        memberId: user.memberId,
        grade: user.grade,
        class: user.class,
        status: user.status,
      },
      stats: {
        totalBorrows,
        currentBorrows,
        returnedCount,
        overdueCount,
      },
      transactions,
    });
  } catch (error) {
    console.error('Get member history error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================
// TEACHER ONLY ROUTES
// ===========================

// GET /api/library/users - Only teacher and librarian can view all users
router.get('/users', protect, authorize('teacher', 'librarian'), async (req, res) => {
  try {
    const users = await User.find().select('-password -resetToken -resetTokenExpiry');
    res.json({ users, count: users.length });
  } catch (error) {
    console.error('Get users error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===========================
// LIBRARIAN ONLY ROUTES
// ===========================

// DELETE /api/library/users/:id - Only librarian can delete a user
router.delete('/users/:id', protect, authorize('librarian'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete yourself' });
    }
    await user.deleteOne();
    res.json({ message: 'User removed', userId: req.params.id });
  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
