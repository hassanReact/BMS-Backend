import UnifiedVoucherService from '../services/UnifiedVoucher.service.js';
import UnifiedVoucher from '../models/UnifiedVoucher.model.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

class UnifiedVoucherController {
  constructor() {
    this.voucherService = new UnifiedVoucherService();
  }

  /**
   * Create a new voucher
   */
  createVoucher = asyncHandler(async (req, res) => {
    const { companyId } = req.body; // Get companyId from request body
    const voucherData = { ...req.body, companyId };

    const result = await this.voucherService.createVoucher(voucherData);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  });

  /**
   * Create maintenance receivable
   */
  createMaintenanceReceivable = asyncHandler(async (req, res) => {
    const { companyId } = req.body; // Get companyId from request body
    const receivableData = { ...req.body, companyId };

    const result = await this.voucherService.createMaintenanceReceivable(receivableData);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      console.log(result.error);
      
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  });

  /**
   * Create vendor payable
   */
  createVendorPayable = asyncHandler(async (req, res) => {
    const { companyId } = req.body; // Get companyId from request body
    const payableData = { ...req.body, companyId };

    const result = await this.voucherService.createVendorPayable(payableData);
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  });

  /**
   * Record payment against receivable/payable
   */
  recordPayment = asyncHandler(async (req, res) => {
    const { companyId } = req.body; // Get companyId from request body
    const paymentData = { ...req.body, companyId };

    const result = await this.voucherService.recordPayment(paymentData);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  });

  /**
   * Get all vouchers with filters
   */
  getVouchers = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { page = 1, limit = 10, voucherType, status, month, propertyId } = req.query;

    const filters = {};
    if (voucherType) filters.voucherType = voucherType;
    if (status) filters.status = status;
    if (month) filters.month = month;
    if (propertyId) filters.propertyId = propertyId;

    const skip = (page - 1) * limit;
    
    const [vouchers, total] = await Promise.all([
      UnifiedVoucher.find({ companyId, isDeleted: false, ...filters })
        .populate('debit.accountId')
        .populate('credit.accountId')
        .populate('propertyId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      UnifiedVoucher.countDocuments({ companyId, isDeleted: false, ...filters })
    ]);

    res.status(200).json({
      success: true,
      data: {
        vouchers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  });

  /**
   * Get voucher by ID
   */
  getVoucherById = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { id } = req.params;

    const voucher = await UnifiedVoucher.findOne({
      _id: id,
      companyId,
      isDeleted: false
    }).populate('debit.accountId credit.accountId propertyId');

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    res.status(200).json({
      success: true,
      data: voucher
    });
  });

  /**
   * Update voucher
   */
  updateVoucher = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.companyId;
    delete updateData.voucherNo;
    delete updateData.voucherType;

    const voucher = await UnifiedVoucher.findOneAndUpdate(
      { _id: id, companyId, isDeleted: false },
      updateData,
      { new: true, runValidators: true }
    ).populate('debit.accountId credit.accountId propertyId');

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Voucher updated successfully',
      data: voucher
    });
  });

  /**
   * Delete voucher (soft delete)
   */
  deleteVoucher = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { id } = req.params;

    const voucher = await UnifiedVoucher.findOneAndUpdate(
      { _id: id, companyId, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Voucher deleted successfully'
    });
  });

  /**
   * Get accounts receivable
   */
  getAccountsReceivable = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { propertyId, month, status } = req.query;
 
    const filters = {};
    if (propertyId) filters.propertyId = propertyId;
    if (month) filters.month = month;
    if (status) filters.paymentStatus = status;

    const result = await this.voucherService.getAccountsReceivable(companyId, filters);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  });

  /**
   * Get accounts payable
   */
  getAccountsPayable = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { month, status } = req.query;

    const filters = {};
    if (month) filters.month = month;
    if (status) filters.paymentStatus = status;

    const result = await this.voucherService.getAccountsPayable(companyId, filters);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  });

  /**
   * Get maintenance services
   */
  getMaintenanceServices = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { month, propertyId, startDate, endDate } = req.query;

    const filters = {};
    if (month) filters.month = month;
    if (propertyId) filters.propertyId = propertyId;
    if (startDate && endDate) {
      filters.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const result = await this.voucherService.getMaintenanceServices(companyId, filters);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  });

  /**
   * Generate ledger for an account
   */
  generateLedger = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { accountId, accountType } = req.params;
    const { month, startDate, endDate } = req.query;

    const filters = {};
    if (month) filters.month = month;
    if (startDate && endDate) {
      filters.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const result = await this.voucherService.generateLedger(
      accountId, 
      accountType, 
      companyId, 
      filters
    );
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  });

  /**
   * Generate aging report
   */
  generateAgingReport = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { voucherType = 'AR' } = req.query;

    const result = await this.voucherService.generateAgingReport(companyId, voucherType);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data,
        voucherType: result.voucherType
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  });

  /**
   * Generate monthly summary
   */
  generateMonthlySummary = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month parameter is required (YYYY-MM format)'
      });
    }

    const result = await this.voucherService.generateMonthlySummary(companyId, month);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  });

  /**
   * Generate trial balance
   */
  generateTrialBalance = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month parameter is required (YYYY-MM format)'
      });
    }

    const result = await this.voucherService.generateTrialBalance(companyId, month);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  });

  /**
   * Get outstanding balance for an account
   */
  getOutstandingBalance = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { accountId, accountType } = req.params;

    const result = await this.voucherService.getOutstandingBalance(
      accountId, 
      accountType, 
      companyId
    );
    
    if (result.success) {
      res.status(200).json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  });

  /**
   * Approve voucher
   */
  approveVoucher = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { id } = req.params;
    const { approvedBy } = req.body;

    const voucher = await UnifiedVoucher.findOneAndUpdate(
      { _id: id, companyId, isDeleted: false },
      { 
        status: 'approved',
        approvedBy,
        approvedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('debit.accountId credit.accountId propertyId');

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Voucher approved successfully',
      data: voucher
    });
  });

  /**
   * Reject voucher
   */
  rejectVoucher = asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    const { id } = req.params;
    const { reason } = req.body;

    const voucher = await UnifiedVoucher.findOneAndUpdate(
      { _id: id, companyId, isDeleted: false },
      { 
        status: 'rejected',
        details: reason || 'Voucher rejected'
      },
      { new: true, runValidators: true }
    ).populate('debit.accountId credit.accountId propertyId');

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Voucher rejected successfully',
      data: voucher
    });
  });
}

export default UnifiedVoucherController;
