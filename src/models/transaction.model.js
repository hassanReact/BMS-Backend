// models/Transaction.js
import mongoose, { Schema } from 'mongoose';

const transactionSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    amount: { type: String, },
    discount: { type: String },
    currency: { type: String },
    transactionDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
