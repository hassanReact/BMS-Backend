// controllers/voucherController.js

import { statusCodes } from '../core/common/constant.js';
import AccountsVoucher from '../models/accountsVoucher.model.js';
import * as voucherService from "../services/voucher.services.js"

// Get all vouchers with pagination and filtering
export const getAllVouchers = async (req, res) => {
    const data = await voucherService.allVoucher(req, res);
    res.status(statusCodes?.ok).send(data);
};

// Get single voucher by ID
export const getVoucherById = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new CustomError(400, 'Voucher ID is required');
    }

    try {
        const voucher = await AccountsVoucher.findById(id)
            .populate('credit.id', 'accountName name')
            .populate('debit.id', 'accountName name')
            .populate('companyId', 'companyName');

        if (!voucher) {
            throw new CustomError(404, 'Voucher not found');
        }

        return voucher;
    } catch (error) {
        if (error.name === 'CastError') {
            throw new CustomError(400, 'Invalid voucher ID format');
        }
        throw new CustomError(500, 'Error fetching voucher', error.message);
    }
};

// Update voucher
export const updateVoucher = async (req, res) => {
    const updatedVoucher = await voucherService.updateVoucherById(req,res);
    res.status(statusCodes.ok).send(updatedVoucher);
};

// Delete voucher
export const deleteVoucher = async (req, res) => {
    const deleteVoucher = await voucherService.deleteVoucherById(req, res);
    res.status(statusCodes.accepted).send(deleteVoucher)
};

// Bulk delete vouchers
export const bulkDeleteVouchers = async (req, res) => {
    const { voucherIds, companyId } = req.body;

    if (!voucherIds || !Array.isArray(voucherIds) || voucherIds.length === 0) {
        throw new CustomError(400, 'voucherIds array is required');
    }

    if (!companyId) {
        throw new CustomError(400, 'Company ID is required');
    }

    try {
        // Verify all vouchers belong to the company
        const vouchers = await AccountsVoucher.find({
            _id: { $in: voucherIds },
            companyId: companyId
        });

        if (vouchers.length !== voucherIds.length) {
            throw new CustomError(400, 'Some vouchers not found or access denied');
        }

        // Delete vouchers
        const deleteResult = await AccountsVoucher.deleteMany({
            _id: { $in: voucherIds },
            companyId: companyId
        });

        return {
            message: `${deleteResult.deletedCount} vouchers deleted successfully`,
            deletedCount: deleteResult.deletedCount
        };
    } catch (error) {
        throw new CustomError(500, 'Error deleting vouchers', error.message);
    }
};

// Get voucher statistics
export const getVoucherStats = async (req, res) => {
    const { companyId, startDate, endDate } = req.query;

    if (!companyId) {
        throw new CustomError(400, 'companyId is required');
    }

    const matchFilter = { companyId };

    if (startDate || endDate) {
        matchFilter.date = {};
        if (startDate) matchFilter.date.$gte = new Date(startDate);
        if (endDate) matchFilter.date.$lte = new Date(endDate);
    }

    try {
        const stats = await AccountsVoucher.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: '$voucherType',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    avgAmount: { $avg: '$amount' }
                }
            },
            {
                $project: {
                    voucherType: '$_id',
                    count: 1,
                    totalAmount: { $round: ['$totalAmount', 2] },
                    avgAmount: { $round: ['$avgAmount', 2] },
                    _id: 0
                }
            }
        ]);

        const totalStats = await AccountsVoucher.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: null,
                    totalVouchers: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    avgAmount: { $avg: '$amount' }
                }
            }
        ]);

        return {
            byType: stats,
            overall: totalStats[0] || {
                totalVouchers: 0,
                totalAmount: 0,
                avgAmount: 0
            }
        };
    } catch (error) {
        throw new CustomError(500, 'Error fetching voucher statistics', error.message);
    }
};