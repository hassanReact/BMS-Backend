import mongoose from 'mongoose';

const unifiedVoucherSchema = new mongoose.Schema({
  voucherNo: {
    type: String,
    required: true,
    unique: true,
  },

  voucherType: {
    type: String,
    enum: [
      'AR',  // Accounts Receivable (Customer owes money)
      'AP',  // Accounts Payable (We owe money)
      'REC', // Receipt (Money received)
      'PAY', // Payment (Money paid)
      'PUR', // Purchase
      'SAL', // Sale/Service Revenue
      'MDN', // Maintenance
      'JV',  // Journal Voucher
      'CN',  // Credit Note
      'PU',
      'SP',  // Debit Note
      'GB'   // Debit Note
    ],
    required: true,
  },

  // Business context reference (what triggered this voucher)
  sourceDocument: {
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'sourceDocument.referenceModel'
    },
    referenceModel: {
      type: String,
      enum: ['Maintenance', 'UsageDetails', 'Bill', 'PurchaseDetails', 'Vendor', 'ServiceProvider', 'Staff', 'Property']
    }
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

  // Accounting period
  month: {
    type: String,
    required: true,
    default: () => new Date().toISOString().slice(0, 7) // YYYY-MM format
  },

  particulars: {
    type: String,
    required: true,
  },

  // Debit entry
  debit: {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'debit.accountType',
      required: true
    },
    accountType: {
      type: String,
      required: true,
      enum: ['Customer', 'Property', 'Vendor', 'UsageDetails', 'Staff', 'PurchaseDetails', 'ServiceProvider', 'Account', 'Company','Bill']
    },
    accountName: String, // Denormalized for reporting
  },

  // Credit entry
  credit: {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'credit.accountType',
      required: true
    },
    accountType: {
      type: String,
      required: true,
      enum: ['Customer', 'PurchaseDetails', 'Property', 'UsageDetails', 'Vendor', 'Staff', 'ServiceProvider', 'Account', 'Company', 'Bill']
    },
    accountName: String, // Denormalized for reporting
  },

  amount: {
    balance: { type: Number },
    total: { type: Number },
    paid: { type: Number }
  },

  // Payment/Receipt tracking
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'partially_paid', 'paid', 'overdue'],
    default: function () {
      return ['AR', 'AP'].includes(this.voucherType) ? 'pending' : 'paid';
    }
  },

  // Due date for receivables/payables
  dueDate: {
    type: Date,
    required: function () {
      return ['AR', 'AP'].includes(this.voucherType);
    }
  },

  // Property context (for BMS specific needs)
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  propertyName: String,

  // Workflow status
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'cancelled'],
    default: 'draft'
  },

  // Approval tracking
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,

  // Linked vouchers (for payments against receivables/payables)
  linkedVouchers: [{
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UnifiedVoucher'
    },
    amount: Number,
    date: Date
  }],
  outstandingAmount: {
    type: Number,
    default: function () {
      return this.amount.total;
    }
  },

  // Surcharge tracking
  surchargeAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Total amount owed (original + surcharge)
  totalAmountOwed: {
    type: Number,
    default: function () {
      return this.amount.total + (this.surchargeAmount || 0);
    }
  },

  // Payment tracking
  lastPaymentAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  lastPaymentDate: {
    type: Date
  },

  // Payment history
  paymentHistory: [{
    amount: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UnifiedVoucher'
    },
    particulars: String
  }],

  tags: [String], // For categorization

  details: String,

  isDeleted: {
    type: Boolean,
    default: false
  },

}, {
  timestamps: true,
});

// Pre-save middleware to calculate surcharges and update totals
unifiedVoucherSchema.pre('save', async function (next) {
  try {
    // Calculate surcharge if this is a maintenance voucher with due date
    if (this.voucherType === 'MDN' && this.dueDate) {
      const currentDate = new Date();
      const dueDate = new Date(this.dueDate);
      const daysPastDue = Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24));

      if (daysPastDue > 0) {
        // Calculate surcharge (you can adjust this logic based on your business rules)
        const surchargePerDay = 5; // Example: 5 per day
        this.surchargeAmount = daysPastDue * surchargePerDay;
      } else {
        this.surchargeAmount = 0;
      }
    }

    // Update total amount owed
    this.totalAmountOwed = this.amount + (this.surchargeAmount || 0);

    // Update outstanding amount if not explicitly set
    if (!this.outstandingAmount || this.outstandingAmount === this.amount) {
      this.outstandingAmount = this.totalAmountOwed;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Indexes for performance
unifiedVoucherSchema.index({ companyId: 1, voucherType: 1, paymentStatus: 1 });
unifiedVoucherSchema.index({ companyId: 1, date: -1 });
unifiedVoucherSchema.index({ voucherNo: 1 });
unifiedVoucherSchema.index({ propertyId: 1, month: 1 });
unifiedVoucherSchema.index({ 'debit.accountId': 1 });
unifiedVoucherSchema.index({ 'credit.accountId': 1 });
unifiedVoucherSchema.index({ companyId: 1, month: 1, voucherType: 1 });

// Virtual for age calculation (for AR/AP aging reports)
unifiedVoucherSchema.virtual('ageInDays').get(function () {
  if (!this.dueDate) return null;
  return Math.floor((new Date() - this.dueDate) / (1000 * 60 * 60 * 24));
});

// Static methods for business queries
unifiedVoucherSchema.statics = {

  // Get Accounts Receivable
  getAccountsReceivable(companyId, filters = {}) {
    return this.find({
      companyId,
      voucherType: 'AR',
      paymentStatus: { $in: ['pending', 'partial', 'overdue'] },
      isDeleted: false,
      ...filters
    }).populate('debit.accountId credit.accountId propertyId');
  },

  // Get Accounts Payable
  getAccountsPayable(companyId, filters = {}) {
    return this.find({
      companyId,
      voucherType: 'AP',
      paymentStatus: { $in: ['pending', 'partial', 'overdue'] },
      isDeleted: false,
      ...filters
    }).populate('debit.accountId credit.accountId');
  },

  // Get outstanding amount for a specific account
  async getOutstandingBalance(accountId, accountType, companyId) {
    const pipeline = [
      {
        $match: {
          companyId: mongoose.Types.ObjectId(companyId),
          $or: [
            { 'debit.accountId': mongoose.Types.ObjectId(accountId), 'debit.accountType': accountType },
            { 'credit.accountId': mongoose.Types.ObjectId(accountId), 'credit.accountType': accountType }
          ],
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          totalDebit: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$debit.accountId', mongoose.Types.ObjectId(accountId)] },
                    { $eq: ['$debit.accountType', accountType] }
                  ]
                },
                '$amount',
                0
              ]
            }
          },
          totalCredit: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$credit.accountId', mongoose.Types.ObjectId(accountId)] },
                    { $eq: ['$credit.accountType', accountType] }
                  ]
                },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ];

    const result = await this.aggregate(pipeline);
    const balance = result[0] ? (result[0].totalDebit - result[0].totalCredit) : 0;
    return balance;
  },

  // Generate aging report for AR/AP
  async getAgingReport(companyId, voucherType = 'AR') {
    const pipeline = [
      {
        $match: {
          companyId: mongoose.Types.ObjectId(companyId),
          voucherType: voucherType,
          paymentStatus: { $in: ['pending', 'partial', 'overdue'] },
          isDeleted: false
        }
      },
      {
        $addFields: {
          ageInDays: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), '$dueDate'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: {
            ageRange: {
              $switch: {
                branches: [
                  { case: { $lt: ['$ageInDays', 0] }, then: 'Not Due' },
                  { case: { $lt: ['$ageInDays', 30] }, then: '0-30 days' },
                  { case: { $lt: ['$ageInDays', 60] }, then: '31-60 days' },
                  { case: { $lt: ['$ageInDays', 90] }, then: '61-90 days' },
                  { case: { $lt: ['$ageInDays', 120] }, then: '91-120 days' }
                ],
                default: 'Over 120 days'
              }
            }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$outstandingAmount' }
        }
      },
      {
        $sort: { '_id.ageRange': 1 }
      }
    ];

    return this.aggregate(pipeline);
  },

  // Generate monthly summary
  async getMonthlySummary(companyId, month) {
    const pipeline = [
      {
        $match: {
          companyId: mongoose.Types.ObjectId(companyId),
          month: month,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$voucherType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ];

    return this.aggregate(pipeline);
  },

  // Get Maintenance Service vouchers
  getMaintenanceServices(companyId, filters = {}) {
    return this.find({
      companyId,
      voucherType: 'MDN',
      tags: { $in: ['Maintenance'] },
      isDeleted: false,
      ...filters
    }).populate('debit.accountId credit.accountId propertyId')
      .sort({ date: -1 });
  },

  // Record a payment against this voucher
  async recordPayment(paymentAmount, paymentVoucherId, particulars = '') {
    try {
      // Add to payment history
      this.paymentHistory.push({
        amount: paymentAmount,
        date: new Date(),
        voucherId: paymentVoucherId,
        particulars: particulars || `Payment of ${paymentAmount}`
      });

      // Update payment tracking
      this.lastPaymentAmount = paymentAmount;
      this.lastPaymentDate = new Date();

      // Calculate new outstanding amount
      const totalPaid = this.paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
      this.outstandingAmount = Math.max(0, this.totalAmountOwed - totalPaid);

      // Update payment status
      if (this.outstandingAmount === 0) {
        this.paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        this.paymentStatus = 'partially_paid';
      }

      await this.save();
      return this;
    } catch (error) {
      throw error;
    }
  }
};

const UnifiedVoucher = mongoose.model("UnifiedVoucher", unifiedVoucherSchema);

export default UnifiedVoucher;
