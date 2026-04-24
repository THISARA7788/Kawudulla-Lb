const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Seed static librarian account if it doesn't exist
    const librarianEmail = process.env.LIBRARIAN_EMAIL || 'admin@library.com';
    const librarianPassword = process.env.LIBRARIAN_PASSWORD || 'admin123456';

    let existingLibrarian = await User.findOne({ email: librarianEmail });
    if (!existingLibrarian) {
      await User.create({
        name: 'Librarian',
        email: librarianEmail,
        password: librarianPassword,
        role: 'librarian',
        status: 'active',
      });
      console.log(`Static librarian account created: ${librarianEmail}`);
    } else {
      const isMatch = await existingLibrarian.comparePassword(librarianPassword);
      if (!isMatch) {
        existingLibrarian.password = librarianPassword;
        await existingLibrarian.save();
        console.log(`Librarian password updated in DB to match .env credentials`);
      }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
