const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const Book = require('../models/Book');

// @route   POST /api/books/upload
// @desc    Upload cover image to Cloudinary
// @access  Private (Librarian)
router.post('/upload', protect, authorize('librarian'), upload.single('coverImage'), (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: 'No file uploaded or upload failed' });
    }
    // multer-storage-cloudinary stores the uploaded image secure URL in req.file.path
    res.json({ secure_url: req.file.path });
  } catch (error) {
    console.error('Image upload error:', error.message);
    res.status(500).json({ message: 'Server error during upload' });
  }
});

// @route   POST /api/books
// @desc    Save a new book in the database
// @access  Private (Librarian)
router.post('/', protect, authorize('librarian'), async (req, res) => {
  try {
    const { title, author, isbn, category, description, totalCopies, publisher, publishedYear, coverImageUrl, status } = req.body;

    if (!title || !author || !category) {
      return res.status(400).json({ message: 'Title, author, and category are required' });
    }

    // Check duplicate ISBN (only if isbn is provided)
    if (isbn && isbn.trim()) {
      const duplicate = await Book.findOne({ isbn: isbn.trim() });
      if (duplicate) {
        return res.status(400).json({ message: 'A book with this ISBN already exists', existingBook: duplicate });
      }
    }

    const book = await Book.create({
      title,
      author,
      isbn: isbn ? isbn.trim() : undefined,
      category,
      description,
      totalCopies: Number(totalCopies) || 1,
      availableCopies: Number(totalCopies) || 1,
      publisher,
      publishedYear: publishedYear ? Number(publishedYear) : undefined,
      coverImageUrl: coverImageUrl || '',
      status: status || 'Available',
    });

    res.status(201).json({ message: 'Book saved successfully', book });
  } catch (error) {
    console.error('Save book error:', error.message);
    res.status(500).json({ message: 'Server error while saving book' });
  }
});

const { lookupSriLankanISBN } = require('../utils/isbnLkpHelper');

// @route   GET /api/books/check/:isbn
// @desc    Check if a book with the given ISBN exists
// @access  Private (Librarian)
router.get('/check/:isbn', protect, authorize('librarian'), async (req, res) => {
  try {
    const { isbn } = req.params;
    const book = await Book.findOne({ isbn: isbn.trim() });
    
    if (book) {
      return res.json({ exists: true, book });
    }
    res.json({ exists: false });
  } catch (error) {
    console.error('Check book error:', error.message);
    res.status(500).json({ message: 'Server error while checking book' });
  }
});

// @route   GET /api/books/lookup-srilanka/:isbn
// @desc    Scrape details of a Sri Lankan book by ISBN
// @access  Private (Librarian)
router.get('/lookup-srilanka/:isbn', protect, authorize('librarian'), async (req, res) => {
  try {
    const { isbn } = req.params;
    const details = await lookupSriLankanISBN(isbn);
    if (details) {
      return res.json({ success: true, book: details });
    }
    res.json({ success: false, message: 'Book not found in Sri Lankan registry' });
  } catch (error) {
    console.error('Sri Lankan ISBN lookup error:', error.message);
    res.status(500).json({ message: 'Server error during Sri Lankan ISBN lookup' });
  }
});

module.exports = router;
