// =========================================================================
// WHAT DOES THIS FILE DO?
// This file houses all backend routes for the book catalog and circulation systems.
// It exposes REST API endpoints to:
// - Catalog books (Create, Read, Update, Delete).
// - Issue books (checks borrow limits, adds active records, locks copy inventories).
// - Return books (marks returned dates, triggers overdue checkouts calculations).
// =========================================================================

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Book = require('../models/Book');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Fine = require('../models/Fine');
const FineConfig = require('../models/FineConfig');
const mongoose = require('mongoose');

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
    if (req.body.totalCopies !== undefined) {
      const newTotal = Number(req.body.totalCopies);
      const diff = newTotal - book.totalCopies;
      book.availableCopies = Math.max(0, book.availableCopies + diff);
    }
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
    const { createNotification } = require('../utils/notificationsHelper');
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
    if (user.status !== 'active') {
      return res.status(400).json({ message: `Cannot issue book. Member is currently "${user.status}" (must be "active").` });
    }

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
    const { createNotification } = require('../utils/notificationsHelper');
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
    const { userId, bookId, returnDate, overdueFine } = req.body;

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

    // Find and update transaction (match 'active' or 'overdue' in case it was flagged)
    const transaction = await Transaction.findOneAndUpdate(
      { user: userId, book: bookId, status: { $in: ['active', 'overdue'] } },
      { returnDate: normalizedReturnDate, status: 'returned' },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction record not found for this borrowing' });
    }

    // Calculate overdue days and auto-generate fine if applicable
    const dueDate = new Date(borrowEntry.dueDate);
    const daysOverdue = Math.max(0, Math.floor((normalizedReturnDate - dueDate) / (1000 * 60 * 60 * 24)));

    if (daysOverdue > 0) {
      transaction.overdueDays = daysOverdue;
      await transaction.save();

      // Fetch fine configuration
      const config = await FineConfig.findOne() || { fineRatePerDay: 10, gracePeriodDays: 0 };

      // Calculate effective overdue days (subtracting grace period)
      const graceEnd = new Date(dueDate.getTime() + config.gracePeriodDays * 86400000);
      const effectiveOverdueDays = Math.max(0, Math.floor((normalizedReturnDate - graceEnd) / (1000 * 60 * 60 * 24)));

      if (effectiveOverdueDays > 0) {
        const existingFine = await Fine.findOne({ transaction: transaction._id });
        if (!existingFine) {
          await Fine.create({
            transaction: transaction._id,
            user: userId,
            book: bookId,
            amount: effectiveOverdueDays * config.fineRatePerDay,
            daysOverdue: effectiveOverdueDays,
            ratePerDay: config.fineRatePerDay,
            status: 'unpaid',
          });
        }
      }
    }

    // Notify user and librarian about return
    const { createNotification } = require('../utils/notificationsHelper');
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
    const now = new Date();

    if (userId) query.user = userId;

    // Dynamic status filtering to correctly identify overdue books
    if (status && status !== 'all') {
      if (status === 'overdue') {
        query.returnDate = null;
        query.$or = [
          { status: 'overdue' },
          { status: 'active', dueDate: { $lt: now } }
        ];
      } else if (status === 'active') {
        // Only truly active (currently borrowed and NOT yet overdue)
        query.status = 'active';
        query.dueDate = { $gte: now };
        query.returnDate = null;
      } else {
        query.status = status;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(query)
      .sort({ updatedAt: -1 }) // Sort by last update (issue time or return time) to show most recent activity first
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name email role memberId grade')
      .populate('book', 'title author isbn bookId category')
      .populate('issuedBy', 'name');

    // Dynamically tag overdue transactions for the UI
    const formattedTransactions = transactions.map(t => {
      const doc = t.toObject();
      // If it's not returned and past due date, flag it as overdue for the UI
      if (!doc.returnDate && new Date(doc.dueDate) < now && doc.status !== 'returned') {
        doc.status = 'overdue';
      }
      return doc;
    });

    const total = await Transaction.countDocuments(query);

    console.log('[DEBUG] Transactions query:', JSON.stringify(query));
    console.log('[DEBUG] Found transactions:', formattedTransactions.length, 'Total in DB:', total);

    res.json({
      transactions: formattedTransactions,
      count: formattedTransactions.length,
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
    
    // Fetch active transactions to retrieve notes
    const transactions = await Transaction.find({ user: user._id, status: { $in: ['active', 'overdue'] } });

    // Map borrowed books to append notes (safeguarded against deleted books / null population)
    const activeBorrowsWithNotes = activeBorrows
      .map(b => {
        const doc = b.toObject ? b.toObject() : b;
        if (!doc.book || !doc.book._id) return null;
        const tx = transactions.find(t => t.book && t.book.toString() === doc.book._id.toString());
        return {
          ...doc,
          notes: tx ? tx.notes : '',
        };
      })
      .filter(Boolean);

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
      borrowedBooks: activeBorrowsWithNotes,
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

// POST /api/library/books/import - Bulk import books via Excel file or CSV
const multer = require('multer');
const ExcelJS = require('exceljs');
const { cloudinary } = require('../config/cloudinary');

const inMemoryStorage = multer.memoryStorage();
const uploadFile = multer({ storage: inMemoryStorage });

const parseCSVText = (csvText) => {
  const parsedRows = [];
  let row = [''];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    const next = csvText[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++; // skip double quote escape
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      parsedRows.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    parsedRows.push(row);
  }
  return parsedRows;
};

router.post('/books/import', protect, authorize('librarian'), uploadFile.single('file'), async (req, res) => {
  try {
    let parsedRows = [];
    const uploadedUrls = {}; // maps row index (0-based) to Cloudinary URL

    // Helper to upload a buffer to Cloudinary
    const uploadStream = (fileBuffer, options) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        });
        stream.end(fileBuffer);
      });
    };

    if (req.file) {
      const isExcel = req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls') || req.file.mimetype.includes('spreadsheet') || req.file.mimetype.includes('excel');

      if (isExcel) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
          return res.status(400).json({ message: 'Spreadsheet contains no worksheets' });
        }

        // Helper to format values safely
        const getCellValueText = (cell) => {
          if (!cell || cell.value === null || cell.value === undefined) return "";
          if (typeof cell.value === 'object') {
            if (cell.value.text) return String(cell.value.text);
            if (cell.value.result !== undefined) return String(cell.value.result);
            if (cell.value.richText) {
              return cell.value.richText.map(t => t.text || "").join("");
            }
            return JSON.stringify(cell.value);
          }
          return String(cell.value);
        };

        // 1. Read standard text rows from ExcelJS worksheet
        worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
          const rowData = [];
          for (let c = 1; c <= 10; c++) {
            const cell = row.getCell(c);
            rowData.push(getCellValueText(cell).trim());
          }
          parsedRows[rowNumber - 1] = rowData; // match 1-indexed to 0-indexed rows
        });

        // Fill in any gaps (empty rows) up to parsedRows.length
        for (let i = 0; i < parsedRows.length; i++) {
          if (!parsedRows[i]) {
            parsedRows[i] = Array(10).fill("");
          }
        }

        // 2. Extract inline pictures and upload to Cloudinary
        const images = worksheet.getImages();
        if (images && images.length > 0) {
          const uploadPromises = [];
          for (const imgInfo of images) {
            const image = workbook.getImage(imgInfo.imageId);
            const range = imgInfo.range;
            if (!range || !range.tl) continue;

            const colIndex = Math.floor(range.tl.col); // 0-indexed column
            const rowIndex = Math.floor(range.tl.row); // 0-indexed row

            // Column B (1) is "BOOK COVER"
            if (colIndex === 1) {
              const imgBuffer = image.buffer;
              const extension = image.extension || 'png';
              const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

              const uploadPromise = (async () => {
                try {
                  const uploadOptions = {
                    folder: 'library_covers',
                    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
                    transformation: [{ width: 800, crop: 'limit' }]
                  };
                  const result = await uploadStream(imgBuffer, uploadOptions);
                  if (result && result.secure_url) {
                    uploadedUrls[rowIndex] = result.secure_url;
                  }
                } catch (uploadErr) {
                  console.error(`Failed to upload inline image for row ${rowIndex}:`, uploadErr.message);
                }
              })();
              uploadPromises.push(uploadPromise);
            }
          }

          if (uploadPromises.length > 0) {
            await Promise.all(uploadPromises);
          }
        }
      } else {
        // Native CSV Parser from Buffer
        const csvText = req.file.buffer.toString('utf8');
        parsedRows = parseCSVText(csvText);
      }
    } else if (req.body.csvText) {
      parsedRows = parseCSVText(req.body.csvText);
    }

    if (parsedRows.length <= 1) {
      return res.status(400).json({ message: 'Spreadsheet is empty or contains no book rows' });
    }

    let headersIndex = 0;
    let headers = parsedRows[headersIndex];
    let cleanHeaders = headers.map(h => h.toLowerCase().replace(/\*/g, '').trim());
    let headerMap = {};

    const mapHeaders = (cleanHdrs) => {
      const map = {};
      cleanHdrs.forEach((h, index) => {
        if (h === 'title' || h === 'book title' || h === 'book_title' || h === 'පොත් නම' || h === 'නම') {
          map.title = index;
        } else if (h === 'author' || h === 'author name' || h === 'writer' || h === 'කර්තෘ') {
          map.author = index;
        } else if (h === 'category' || h === 'genre' || h === 'කාණ්ඩය') {
          map.category = index;
        } else if (h === 'totalcopies' || h === 'copies' || h === 'total copies' || h === 'quantity' || h === 'පිටපත් ගණන') {
          map.totalCopies = index;
        } else if (h === 'isbn' || h === 'barcode' || h === 'isbn අංකය') {
          map.isbn = index;
        } else if (h === 'publisher' || h === 'ප්‍රකාශකයා') {
          map.publisher = index;
        } else if (h === 'publishedyear' || h === 'published year' || h === 'year' || h === 'වසර') {
          map.publishedYear = index;
        } else if (h === 'description' || h === 'summary' || h === 'විස්තරය') {
          map.description = index;
        } else if (h === 'coverimageurl' || h === 'cover image' || h === 'book cover' || h === 'book_cover' || h === 'image' || h === 'photo') {
          map.coverImageUrl = index;
        }
      });
      return map;
    };

    headerMap = mapHeaders(cleanHeaders);

    // If headers are not found in the first row, check the second row (e.g. if row 0 was a title instruction row)
    if ((headerMap.title === undefined || headerMap.author === undefined) && parsedRows.length > 1) {
      const secondHeaders = parsedRows[1];
      const secondCleanHeaders = secondHeaders.map(h => h.toLowerCase().replace(/\*/g, '').trim());
      const secondHeaderMap = mapHeaders(secondCleanHeaders);
      if (secondHeaderMap.title !== undefined && secondHeaderMap.author !== undefined) {
        headersIndex = 1;
        headers = secondHeaders;
        cleanHeaders = secondCleanHeaders;
        headerMap = secondHeaderMap;
      }
    }

    if (headerMap.title === undefined || headerMap.author === undefined) {
      return res.status(400).json({ message: 'Required headers (Title, Author) are missing from the CSV file' });
    }

    const booksToInsert = [];
    const skippedDuplicates = [];
    const existingIsbns = new Set(
      (await Book.find({ isbn: { $exists: true, $ne: '' } }, 'isbn')).map(b => b.isbn)
    );
    const processedFileIsbns = new Set();

    const BookCounter = mongoose.models.BookCounter || mongoose.model('BookCounter');
    let currentSeq = 0;
    const counterRecord = await BookCounter.findById('bookId');
    if (counterRecord) {
      currentSeq = counterRecord.seq;
    }

    for (let r = headersIndex + 1; r < parsedRows.length; r++) {
      const rowData = parsedRows[r];
      if (rowData.length === 0 || (rowData.length === 1 && rowData[0] === '')) continue;

      const title = headerMap.title !== undefined ? rowData[headerMap.title]?.trim() : '';
      const author = headerMap.author !== undefined ? rowData[headerMap.author]?.trim() : '';
      const category = headerMap.category !== undefined ? rowData[headerMap.category]?.trim() : 'Fiction';

      if (!title || !author) continue;

      const rawIsbn = headerMap.isbn !== undefined ? rowData[headerMap.isbn]?.trim() : '';
      const isbn = rawIsbn ? rawIsbn.replace(/[^0-9X]/gi, '') : undefined;

      if (isbn) {
        if (existingIsbns.has(isbn) || processedFileIsbns.has(isbn)) {
          skippedDuplicates.push({ title, author, isbn });
          continue;
        }
        processedFileIsbns.add(isbn);
      }

      const totalCopiesVal = headerMap.totalCopies !== undefined ? parseInt(rowData[headerMap.totalCopies], 10) : 1;
      const totalCopies = isNaN(totalCopiesVal) ? 1 : totalCopiesVal;

      const publisher = headerMap.publisher !== undefined ? rowData[headerMap.publisher]?.trim() : '';
      const publishedYearVal = headerMap.publishedYear !== undefined ? parseInt(rowData[headerMap.publishedYear], 10) : undefined;
      const publishedYear = isNaN(publishedYearVal) ? undefined : publishedYearVal;

      const description = headerMap.description !== undefined ? rowData[headerMap.description]?.trim() : '';
      
      // Use uploaded inline picture URL, or fallback to file name text in column
      let coverImageUrl = uploadedUrls[r] || '';
      if (!coverImageUrl) {
        coverImageUrl = headerMap.coverImageUrl !== undefined ? rowData[headerMap.coverImageUrl]?.trim() : '';
        if (coverImageUrl && !coverImageUrl.startsWith('http')) {
          const publicId = coverImageUrl.replace(/\.[^/.]+$/, "");
          const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'hekki8ae';
          coverImageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/library_covers/${publicId}`;
        }
      }

      currentSeq++;
      const bookId = `BK${String(currentSeq).padStart(3, '0')}`;

      booksToInsert.push({
        bookId,
        title,
        author,
        isbn,
        category: category || 'Fiction',
        description,
        totalCopies,
        availableCopies: totalCopies,
        publisher,
        publishedYear,
        coverImageUrl,
        status: 'Available',
      });
    }

    if (booksToInsert.length > 0) {
      await Book.insertMany(booksToInsert);
      await BookCounter.findOneAndUpdate(
        { _id: 'bookId' },
        { seq: currentSeq },
        { upsert: true, new: true }
      );
    }

    res.status(201).json({
      success: true,
      importedCount: booksToInsert.length,
      skippedCount: skippedDuplicates.length,
      skipped: skippedDuplicates,
    });
  } catch (error) {
    console.error('Import books error:', error.message);
    res.status(500).json({ message: 'Server error during bulk import' });
  }
});

module.exports = router;
