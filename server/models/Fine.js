const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema(
  {
    fineId: {
      type: String,
      unique: true,
      sparse: true,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
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
    amount: {
      type: Number,
      required: true,
    },
    daysOverdue: {
      type: Number,
      required: true,
    },
    ratePerDay: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['unpaid', 'paid', 'waived'],
      default: 'unpaid',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    waivedReason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const fineCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const FineCounter =
  mongoose.models.FineCounter ||
  mongoose.model('FineCounter', fineCounterSchema);

// Auto-generate sequential Fine ID on creation (e.g., F-0001)
fineSchema.pre('save', async function (next) {
  if (this.isNew && !this.fineId) {
    try {
      const counter = await FineCounter.findByIdAndUpdate(
        'fineId',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.fineId = `F-${String(counter.seq).padStart(4, '0')}`;
    } catch (err) {
      console.error('Error generating fine sequence:', err);
      const fallbackSeq = Date.now().toString(36).toUpperCase();
      this.fineId = `F-${fallbackSeq}`;
    }
  }
  next();
});

module.exports = mongoose.model('Fine', fineSchema);
