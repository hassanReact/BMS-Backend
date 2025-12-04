import { statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import AccountsVoucher from "../models/accountsVoucher.model.js";
import Property from "../models/property.model.js";
import Vendor from "../models/vendor.model.js";
import staff from "../models/staff.model.js";
import TransactionalAccounts from "../models/transactionalAccounts.model.js";
import mongoose from "mongoose";
import UnifiedVoucher from "../models/UnifiedVoucher.model.js";

// Get all reference entities for voucher selection
export const getVoucherReferences = async (req, res) => {
  try {
    const companyId = req.query.companyId;

    if (!companyId) {
      throw new CustomError(
        statusCodes?.badRequest,
        "Company ID is required",
        "bad_request"
      );
    }

    // Get all properties
    const properties = await Property.find({
      companyId,
      isDeleted: false
    }).select('_id propertyname').lean();

    // Get all vendors
    const vendors = await Vendor.find({
      companyId,
      isDeleted: false
    }).select('_id vendorName').lean();

    // Get all staff
    const staffMembers = await staff.find({
      companyId,
      isDeleted: false
    }).select('_id name').lean();

    // Get all transactional accounts
    const accounts = await TransactionalAccounts.find({
      companyId,
      isDeleted: false
    }).select('_id accountName').lean();

    // Format response with model information
    const references = [
      ...properties.map(item => ({
        _id: item._id,
        name: item.propertyname,
        modelName: 'Property'
      })),
      ...vendors.map(item => ({
        _id: item._id,
        name: item.vendorName,
        modelName: 'Vendor'
      })),
      ...staffMembers.map(item => ({
        _id: item._id,
        name: item.name,
        modelName: 'Staff'
      })),
      ...accounts.map(item => ({
        _id: item._id,
        name: item.accountName,
        modelName: 'Account'
      }))
    ];

    res.status(statusCodes?.ok).json({
      success: true,
      data: references
    });

  } catch (error) {
    console.error('getVoucherReferences error:', error);
    res.status(error.statusCode || statusCodes?.internalServerError).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// Create a general voucher
export const createGeneralVoucher = async (req, res) => {
  try {
    const {
      voucherNo,
      amount,
      companyId,
      date,
      particulars,
      debit,
      credit,
      voucherType,
      month,
      tags,
      status
    } = req.body;

    // Validate required fields
    if (!amount || !companyId || !debit?.accountId || !debit?.accountType || !credit?.accountId || !credit?.accountType) {
      throw new CustomError(
        statusCodes?.badRequest,
        "All required fields must be provided (amount, companyId, debit.accountId, debit.accountType, credit.accountId, credit.accountType)",
        "bad_request"
      );
    }

    // Import UnifiedVoucher model
    const { default: UnifiedVoucher } = await import("../models/UnifiedVoucher.model.js");

    // Check if voucher number already exists (if provided)
    if (voucherNo) {
      const existingVoucher = await UnifiedVoucher.findOne({
        voucherNo,
        companyId,
        isDeleted: false
      });

      if (existingVoucher) {
        throw new CustomError(
          statusCodes?.conflict,
          "Voucher number already exists",
          "conflict"
        );
      }
    }

    // Create the unified voucher
    const voucher = await UnifiedVoucher.create({
      voucherNo,
      voucherType: voucherType || 'JV', // Journal Voucher
      date: date || new Date(),
      month: month || new Date().toISOString().slice(0, 7), // YYYY-MM format
      particulars: particulars || 'Journal entry',
      sourceDocument: {
        referenceId: debit.accountId,
        referenceModel: debit.accountType
      },
      debit: {
        accountId: debit.accountId,
        accountType: debit.accountType,
        accountName: debit.accountName || ''
      },
      credit: {
        accountId: credit.accountId,
        accountType: credit.accountType,
        accountName: credit.accountName || ''
      },
      amount: typeof amount === 'object' ? amount : {
        total: parseFloat(amount),
        balance: parseFloat(amount)
      },
      companyId,
      tags: tags || ['Journal', 'General'],
      status: status || 'draft'
    });

    res.status(statusCodes?.created).json({
      success: true,
      message: "General voucher created successfully",
      data: voucher
    });

  } catch (error) {
    console.error('createGeneralVoucher error:', error);
    res.status(error.statusCode || statusCodes?.internalServerError).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// Get all general vouchers
export const getAllGeneralVouchers = async (req, res) => {
  try {
    const companyId = req.query.companyId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (!companyId) {
      throw new CustomError(
        statusCodes?.badRequest,
        "Company ID is required",
        "bad_request"
      );
    }

    const vouchers = await AccountsVoucher.find({
      companyId,
      voucherType: 'VCH',
      isDeleted: false
    })
      .populate('credit.referenceId', 'propertyname vendorName name accountName')
      .populate('debit.referenceId', 'propertyname vendorName name accountName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await AccountsVoucher.countDocuments({
      companyId,
      voucherType: 'VCH',
      isDeleted: false
    });

    res.status(statusCodes?.ok).json({
      success: true,
      data: {
        vouchers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('getAllGeneralVouchers error:', error);
    res.status(error.statusCode || statusCodes?.internalServerError).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// Get a specific general voucher by ID
export const getGeneralVoucherById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.companyId;

    if (!companyId) {
      throw new CustomError(
        statusCodes?.badRequest,
        "Company ID is required",
        "bad_request"
      );
    }

    const voucher = await AccountsVoucher.findOne({
      _id: id,
      companyId,
      voucherType: 'VCH',
      isDeleted: false
    })
      .populate('credit.referenceId', 'propertyname vendorName name accountName')
      .populate('debit.referenceId', 'propertyname vendorName name accountName')
      .lean();

    if (!voucher) {
      throw new CustomError(
        statusCodes?.notFound,
        "General voucher not found",
        "not_found"
      );
    }

    res.status(statusCodes?.ok).json({
      success: true,
      data: voucher
    });

  } catch (error) {
    console.error('getGeneralVoucherById error:', error);
    res.status(error.statusCode || statusCodes?.internalServerError).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// Update a general voucher
export const updateGeneralVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      voucherNo,
      date,
      particulars,
      details,
      amount,
      companyId,
      creditReferenceId,
      creditReferenceModel,
      debitReferenceId,
      debitReferenceModel,
      status
    } = req.body;

    if (!companyId) {
      throw new CustomError(
        statusCodes?.badRequest,
        "Company ID is required",
        "bad_request"
      );
    }

    // Check if voucher exists
    const existingVoucher = await AccountsVoucher.findOne({
      _id: id,
      companyId,
      voucherType: 'VCH',
      isDeleted: false
    });

    if (!existingVoucher) {
      throw new CustomError(
        statusCodes?.notFound,
        "General voucher not found",
        "not_found"
      );
    }

    // Check if voucher number is being changed and if it already exists
    if (voucherNo && voucherNo !== existingVoucher.voucherNo) {
      const duplicateVoucher = await AccountsVoucher.findOne({
        voucherNo,
        companyId,
        _id: { $ne: id },
        isDeleted: false
      });

      if (duplicateVoucher) {
        throw new CustomError(
          statusCodes?.conflict,
          "Voucher number already exists",
          "conflict"
        );
      }
    }

    // Update the voucher
    const updateData = {};
    if (voucherNo) updateData.voucherNo = voucherNo;
    if (date) updateData.date = date;
    if (particulars !== undefined) updateData.particulars = particulars;
    if (details !== undefined) updateData.details = details;
    if (amount) updateData.amount = amount;
    if (status) updateData.status = status;

    if (creditReferenceId && creditReferenceModel) {
      updateData.credit = {
        referenceId: creditReferenceId,
        referenceModel: creditReferenceModel
      };
    }

    if (debitReferenceId && debitReferenceModel) {
      updateData.debit = {
        referenceId: debitReferenceId,
        referenceModel: debitReferenceModel
      };
    }

    const updatedVoucher = await AccountsVoucher.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('credit.referenceId', 'propertyname vendorName name accountName')
      .populate('debit.referenceId', 'propertyname vendorName name accountName');

    res.status(statusCodes?.ok).json({
      success: true,
      message: "General voucher updated successfully",
      data: updatedVoucher
    });

  } catch (error) {
    console.error('updateGeneralVoucher error:', error);
    res.status(error.statusCode || statusCodes?.internalServerError).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// Delete a general voucher (soft delete)
export const deleteGeneralVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.companyId;

    if (!companyId) {
      throw new CustomError(
        statusCodes?.badRequest,
        "Company ID is required",
        "bad_request"
      );
    }

    const voucher = await AccountsVoucher.findOne({
      _id: id,
      companyId,
      voucherType: 'VCH',
      isDeleted: false
    });

    if (!voucher) {
      throw new CustomError(
        statusCodes?.notFound,
        "General voucher not found",
        "not_found"
      );
    }

    await AccountsVoucher.findByIdAndUpdate(id, { isDeleted: true });

    res.status(statusCodes?.ok).json({
      success: true,
      message: "General voucher deleted successfully"
    });

  } catch (error) {
    console.error('deleteGeneralVoucher error:', error);
    res.status(error.statusCode || statusCodes?.internalServerError).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};

// Approve a general voucher
export const approveGeneralVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.companyId;

    if (!companyId) {
      throw new CustomError(
        statusCodes?.badRequest,
        "Company ID is required",
        "bad_request"
      );
    }

    const voucher = await AccountsVoucher.findOne({
      _id: id,
      companyId,
      voucherType: 'VCH',
      isDeleted: false
    });

    if (!voucher) {
      throw new CustomError(
        statusCodes?.notFound,
        "General voucher not found",
        "not_found"
      );
    }

    const updatedVoucher = await AccountsVoucher.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedAt: new Date()
      },
      { new: true }
    )
      .populate('credit.referenceId', 'propertyname vendorName name accountName')
      .populate('debit.referenceId', 'propertyname vendorName name accountName');

    res.status(statusCodes?.ok).json({
      success: true,
      message: "General voucher approved successfully",
      data: updatedVoucher
    });

  } catch (error) {
    console.error('approveGeneralVoucher error:', error);
    res.status(error.statusCode || statusCodes?.internalServerError).json({
      success: false,
      message: error.message || 'Server Error'
    });
  }
};
