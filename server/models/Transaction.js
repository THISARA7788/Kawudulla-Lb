// =========================================================================
// WHAT DOES THIS FILE DO?
// This file defines the Mongoose Database Schema for Transactions.
// It logs book issues (checkout logs), due dates, actual return logs,
// outstanding overdue day calculations, and statuses (active/returned/overdue).
// =========================================================================

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'returned', 'overdue'],
      default: 'active',
    },
    notes: {
      type: String,
      default: '',
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    overdueDays: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate transaction ID on creation
transactionSchema.pre('save', async function (next) {
  if (this.isNew && !this.transactionId) {
    const seq = Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    this.transactionId = `TRX-${seq}`;
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
