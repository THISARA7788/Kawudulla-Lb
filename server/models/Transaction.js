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

transactionSchema.index({ status: 1, dueDate: 1 });
transactionSchema.index({ user: 1, status: 1 });
transactionSchema.index({ book: 1, status: 1 });

const transactionCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const TransactionCounter =
  mongoose.models.TransactionCounter ||
  mongoose.model('TransactionCounter', transactionCounterSchema);

// Auto-generate sequential Transaction Number on creation (e.g., TRN-0001)
transactionSchema.pre('save', async function (next) {
  if (this.isNew && !this.transactionId) {
    try {
      const counter = await TransactionCounter.findByIdAndUpdate(
        'transactionId',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.transactionId = `TRN-${String(counter.seq).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating transaction sequence:', err);
      // Fallback in case counter operation fails
      const fallbackSeq = Date.now().toString(36).toUpperCase();
      this.transactionId = `TRN-${fallbackSeq}`;
    }
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
