// models/Voucher.js

import mongoose from 'mongoose';

const accountsVoucherSchema = new mongoose.Schema({
  voucherNo: {
    type: String,
    required: true,
    unique: true,
  },
  voucherType: {
    type: String,
    enum: ['AP', 'PUR', 'VCH', 'SAL', 'REC', 'PAY', 'Bill'], // Added more common voucher types
    required: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'models'
  },
  models: {
    type: String,
    required: true,
    enum: ['Property', 'PurchaseDetails', 'Vendor', 'Transaction', 'Staff', 'Customer','Maintenance', 'Bill', 'Account', 'ServiceProvider']
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  particulars: {
    type: String,
    default: '',
  },

  // Credit entry using refPath pattern
  credit: {
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'credit.referenceModel'
    },
    referenceModel: {
      type: String,
      required: true,
      enum: ['Property', 'PurchaseDetails', 'Vendor', 'Transaction', 'Staff', 'Maintenance', 'Customer', 'Account', 'ServiceProvider', 'Company']
    }
  },

  // Debit entry using refPath pattern
  debit: {
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'debit.referenceModel'
    },
    referenceModel: {
      type: String,
      required: true,
      enum: ['Property', 'PurchaseDetails', 'Vendor', 'Transaction', 'Staff', 'Maintenance', 'Customer', 'Account', 'ServiceProvider', 'Company']
    }
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'draft'
  },

  isDeleted: {
    type: Boolean,
    default: false
  },

  details: {
    type: String,
    default: '',
  },
  approvedAt: {
    type: Date
  },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
}, {
  timestamps: true,
});

// Indexes for better performance
accountsVoucherSchema.index({ companyId: 1, voucherType: 1 });
accountsVoucherSchema.index({ companyId: 1, date: -1 });
accountsVoucherSchema.index({ voucherNo: 1 });


const AccountsVoucher = mongoose.model("AccountVoucher", accountsVoucherSchema);

export default AccountsVoucher;