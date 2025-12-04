import UnifiedVoucher from '../models/UnifiedVoucher.model.js';
import mongoose from 'mongoose';

/**
 * Unified Voucher Service
 * Provides business-friendly methods for all accounting operations
 */
class UnifiedVoucherService {
  
  /**
   * Create a new voucher
   */
  async createVoucher(voucherData) {
    try {
      // Generate voucher number if not provided
      if (!voucherData.voucherNo) {
        voucherData.voucherNo = await this.generateVoucherNumber(
          voucherData.companyId, 
          voucherData.voucherType
        );
      }

      // Validate double-entry accounting
      this.validateDoubleEntry(voucherData);

      // Create voucher
      const voucher = new UnifiedVoucher(voucherData);
      await voucher.save();

      return {
        success: true,
        data: voucher,
        message: 'Voucher created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create voucher'
      };
    }
  }

  /**
   * Create Accounts Receivable voucher
   */
  async createMaintenanceReceivable(data) {

    console.log(data);

    // try {
      const voucherData = {
        voucherType: 'AR',
        companyId: data.companyId,
        date: data.date || new Date(),
        month: data.month || new Date().toISOString().slice(0, 7),
        particulars: `Maintenance - ${data.propertyName || 'Property'}`,
        debit: {
          accountId: data.customerId,
          accountType: 'Customer',
          accountName: data.customerName
        },
        credit: {
          accountId: data.companyId,
          accountType: 'Company',
          accountName: 'Company'
        },
        amount: data.amount,
        dueDate: data.dueDate || this.calculateDueDate(30),
        propertyId: data.propertyId,
        propertyName: data.propertyName,
        sourceDocument: {
          referenceId: data.maintenanceId,
          referenceModel: 'Maintenance'
        },
        tags: ['Maintenance', 'AR'],
        status: 'approved'
      };

      const result = await this.createVoucher(voucherData);
      console.log(result);
      return result;
    // } catch (error) {
    //   return {
    //     success: false,
    //     error: error.message,
    //     message: 'Failed to create maintenance receivable'
    //   };
    // }
  }

  /**
   * Create Accounts Payable voucher
   */
  async createVendorPayable(data) {
    try {
      const voucherData = {
        voucherType: 'AP',
        companyId: data.companyId,
        date: data.date || new Date(),
        month: data.month || new Date().toISOString().slice(0, 7),
        particulars: `Vendor Payment - ${data.vendorName}`,
        debit: {
          accountId: data.companyId,
          accountType: 'Company',
          accountName: 'Company'
        },
        credit: {
          accountId: data.vendorId,
          accountType: 'Vendor',
          accountName: data.vendorName
        },
        amount: data.amount,
        dueDate: data.dueDate || this.calculateDueDate(30),
        sourceDocument: {
          referenceId: data.purchaseId,
          referenceModel: 'PurchaseDetails'
        },
        tags: ['Vendor', 'AP'],
        status: 'approved'
      };

      return await this.createVoucher(voucherData);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create vendor payable'
      };
    }
  }

  /**
   * Record payment against receivable/payable
   */
  async recordPayment(data) {
    try {
      const { voucherId, paymentAmount, paymentDate, paymentMethod } = data;

      // Get the original voucher
      const originalVoucher = await UnifiedVoucher.findById(voucherId);
      if (!originalVoucher) {
        throw new Error('Original voucher not found');
      }

      if (!['AR', 'AP'].includes(originalVoucher.voucherType)) {
        throw new Error('Can only record payments against AR or AP vouchers');
      }

      // Create payment voucher
      const paymentVoucherData = {
        voucherType: originalVoucher.voucherType === 'AR' ? 'REC' : 'PAY',
        companyId: originalVoucher.companyId,
        date: paymentDate || new Date(),
        month: new Date().toISOString().slice(0, 7),
        particulars: `Payment against ${originalVoucher.voucherNo}`,
        debit: originalVoucher.voucherType === 'AR' ? 
          { accountId: originalVoucher.companyId, accountType: 'Company', accountName: 'Company' } :
          { accountId: originalVoucher.credit.accountId, accountType: originalVoucher.credit.accountType, accountName: originalVoucher.credit.accountName },
        credit: originalVoucher.voucherType === 'AR' ? 
          { accountId: originalVoucher.debit.accountId, accountType: originalVoucher.debit.accountType, accountName: originalVoucher.debit.accountName } :
          { accountId: originalVoucher.companyId, accountType: 'Company', accountName: 'Company' },
        amount: paymentAmount,
        sourceDocument: {
          referenceId: originalVoucher._id,
          referenceModel: 'UnifiedVoucher'
        },
        tags: ['Payment', originalVoucher.voucherType === 'AR' ? 'REC' : 'PAY'],
        status: 'approved'
      };

      const paymentResult = await this.createVoucher(paymentVoucherData);
      if (!paymentResult.success) {
        throw new Error(paymentResult.error);
      }

      // Update original voucher
      const paymentVoucher = paymentResult.data;
      const newOutstandingAmount = Math.max(0, originalVoucher.outstandingAmount - paymentAmount);
      
      // Update outstanding amount and payment status
      const updateData = {
        outstandingAmount: newOutstandingAmount,
        paymentStatus: newOutstandingAmount === 0 ? 'paid' : 'partial',
        linkedVouchers: [
          ...originalVoucher.linkedVouchers,
          {
            voucherId: paymentVoucher._id,
            amount: paymentAmount,
            date: paymentDate || new Date()
          }
        ]
      };

      await UnifiedVoucher.findByIdAndUpdate(voucherId, updateData);

      return {
        success: true,
        data: {
          originalVoucher: await UnifiedVoucher.findById(voucherId),
          paymentVoucher: paymentVoucher
        },
        message: 'Payment recorded successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to record payment'
      };
    }
  }

  /**
   * Get Accounts Receivable with filters
   */
  async getAccountsReceivable(companyId, filters = {}) {
    try {
      const query = {
        companyId,
        voucherType: 'AR',
        paymentStatus: { $in: ['pending', 'partial', 'overdue'] },
        isDeleted: false,
        ...filters
      };

      const vouchers = await UnifiedVoucher.find(query)
        .populate('debit.accountId')
        .populate('credit.accountId')
        .populate('propertyId')
        .sort({ dueDate: 1 });

      const totalOutstanding = vouchers.reduce((sum, v) => sum + v.outstandingAmount, 0);

      return {
        success: true,
        data: {
          vouchers,
          totalOutstanding,
          count: vouchers.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get accounts receivable'
      };
    }
  }

  /**
   * Get Accounts Payable with filters
   */
  async getAccountsPayable(companyId, filters = {}) {
    try {
      const query = {
        companyId,
        voucherType: 'AP',
        paymentStatus: { $in: ['pending', 'partial', 'overdue'] },
        isDeleted: false,
        ...filters
      };

      const vouchers = await UnifiedVoucher.find(query)
        .populate('debit.accountId')
        .populate('credit.accountId')
        .sort({ dueDate: 1 });

      const totalOutstanding = vouchers.reduce((sum, v) => sum + v.outstandingAmount, 0);

      return {
        success: true,
        data: {
          vouchers,
          totalOutstanding,
          count: vouchers.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get accounts payable'
      };
    }
  }

  /**
   * Get Maintenance Service vouchers
   */
  async getMaintenanceServices(companyId, filters = {}) {
    try {
      const query = {
        companyId,
        voucherType: 'MDN',
        tags: { $in: ['Maintenance'] },
        isDeleted: false,
        ...filters
      };

      const vouchers = await UnifiedVoucher.find(query)
        .populate('debit.accountId')
        .populate('credit.accountId')
        .populate('propertyId')
        .sort({ date: -1 });

      const totalRevenue = vouchers.reduce((sum, v) => sum + v.amount, 0);

      return {
        success: true,
        data: {
          vouchers,
          totalRevenue,
          count: vouchers.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get maintenance services'
      };
    }
  }

  /**
   * Generate ledger for a specific account
   */
  async generateLedger(accountId, accountType, companyId, filters = {}) {
    try {
      const pipeline = [
        {
          $match: {
            companyId: mongoose.Types.ObjectId(companyId),
            $or: [
              { 'debit.accountId': mongoose.Types.ObjectId(accountId), 'debit.accountType': accountType },
              { 'credit.accountId': mongoose.Types.ObjectId(accountId), 'credit.accountType': accountType }
            ],
            isDeleted: false,
            ...filters
          }
        },
        {
          $addFields: {
            isDebit: {
              $eq: ['$debit.accountId', mongoose.Types.ObjectId(accountId)]
            },
            entryType: {
              $cond: [
                { $eq: ['$debit.accountId', mongoose.Types.ObjectId(accountId)] },
                'Debit',
                'Credit'
              ]
            }
          }
        },
        {
          $sort: { date: 1 }
        }
      ];

      const ledger = await UnifiedVoucher.aggregate(pipeline);

      // Calculate running balance
      let balance = 0;
      const ledgerWithBalance = ledger.map(entry => {
        if (entry.isDebit) {
          balance += entry.amount;
        } else {
          balance -= entry.amount;
        }
        return {
          ...entry,
          runningBalance: balance
        };
      });

      return {
        success: true,
        data: {
          ledger: ledgerWithBalance,
          finalBalance: balance,
          accountId,
          accountType
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate ledger'
      };
    }
  }

  /**
   * Generate aging report
   */
  async generateAgingReport(companyId, voucherType = 'AR') {
    try {
      const agingReport = await UnifiedVoucher.getAgingReport(companyId, voucherType);
      
      return {
        success: true,
        data: agingReport,
        voucherType
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate aging report'
      };
    }
  }

  /**
   * Generate monthly summary
   */
  async generateMonthlySummary(companyId, month) {
    try {
      const summary = await UnifiedVoucher.getMonthlySummary(companyId, month);
      
      return {
        success: true,
        data: summary,
        month
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate monthly summary'
      };
    }
  }

  /**
   * Get outstanding balance for an account
   */
  async getOutstandingBalance(accountId, accountType, companyId) {
    try {
      const balance = await UnifiedVoucher.getOutstandingBalance(accountId, accountType, companyId);
      
      return {
        success: true,
        data: {
          accountId,
          accountType,
          balance
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to get outstanding balance'
      };
    }
  }

  /**
   * Generate trial balance
   */
  async generateTrialBalance(companyId, month) {
    try {
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
            _id: {
              accountId: '$debit.accountId',
              accountType: '$debit.accountType',
              accountName: '$debit.accountName'
            },
            totalDebit: { $sum: '$amount' }
          }
        },
        {
          $unionWith: {
            coll: 'unifiedvouchers',
            pipeline: [
              {
                $match: {
                  companyId: mongoose.Types.ObjectId(companyId),
                  month: month,
                  isDeleted: false
                }
              },
              {
                $group: {
                  _id: {
                    accountId: '$credit.accountId',
                    accountType: '$credit.accountType',
                    accountName: '$credit.accountName'
                  },
                  totalCredit: { $sum: '$amount' }
                }
              }
            ]
          }
        },
        {
          $group: {
            _id: {
              accountId: '$_id.accountId',
              accountType: '$_id.accountType',
              accountName: '$_id.accountName'
            },
            totalDebit: { $sum: { $ifNull: ['$totalDebit', 0] } },
            totalCredit: { $sum: { $ifNull: ['$totalCredit', 0] } }
          }
        },
        {
          $addFields: {
            balance: { $subtract: ['$totalDebit', '$totalCredit'] }
          }
        },
        {
          $sort: { '_id.accountType': 1, '_id.accountName': 1 }
        }
      ];

      const trialBalance = await UnifiedVoucher.aggregate(pipeline);
      
      const totalDebits = trialBalance.reduce((sum, account) => sum + account.totalDebit, 0);
      const totalCredits = trialBalance.reduce((sum, account) => sum + account.totalCredit, 0);

      return {
        success: true,
        data: {
          trialBalance,
          totalDebits,
          totalCredits,
          month
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate trial balance'
      };
    }
  }

  /**
   * Generate voucher number
   */
  async generateVoucherNumber(companyId, voucherType) {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      
      // Get count for this month
      const count = await UnifiedVoucher.countDocuments({
        companyId,
        voucherType,
        month: `${year}-${month}`,
        isDeleted: false
      });

      return `${voucherType}-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    } catch (error) {
      throw new Error('Failed to generate voucher number');
    }
  }

  /**
   * Validate double-entry accounting
   */
  validateDoubleEntry(voucherData) {
    if (!voucherData.debit || !voucherData.credit) {
      throw new Error('Both debit and credit entries are required');
    }
    
    if (!voucherData.debit.accountId || !voucherData.credit.accountId) {
      throw new Error('Account IDs are required for both debit and credit');
    }
    
    if (voucherData.debit.accountId.toString() === voucherData.credit.accountId.toString()) {
      throw new Error('Debit and credit cannot be the same account');
    }
  }

  /**
   * Calculate due date
   */
  calculateDueDate(daysFromNow) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
    return dueDate;
  }
}

export default UnifiedVoucherService;
