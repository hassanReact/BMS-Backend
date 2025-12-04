import AccountsVoucher from "../models/accountsVoucher.model.js";
import mongoose from 'mongoose';

export const allVoucher = async (req, res) => {
    const {
        page = 1,
        limit = 10,
        companyId,
        voucherType,
        search,
        startDate,
        endDate
    } = req.query;

    // Validate required companyId
    if (!companyId) {
        throw new Error('Company ID is required');
    }

    // Build filter object
    const filter = { companyId, isDeleted: false };

    if (voucherType) {
        filter.voucherType = voucherType;
    }

    if (search) {
        filter.$or = [
            { voucherNo: { $regex: search, $options: 'i' } },
            { particulars: { $regex: search, $options: 'i' } },
            { details: { $regex: search, $options: 'i' } }
        ];
    }

    if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
            const start = new Date(startDate);
            if (isNaN(start.getTime())) {
                throw new Error('Invalid start date format');
            }
            filter.date.$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            if (isNaN(end.getTime())) {
                throw new Error('Invalid end date format');
            }
            // Set to end of day
            end.setHours(23, 59, 59, 999);
            filter.date.$lte = end;
        }
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit))); // Limit max to 100
    const skip = (pageNum - 1) * limitNum;

    try {
        const [vouchers, totalCount] = await Promise.all([
            AccountsVoucher.find(filter)
                .populate('companyId', 'companyName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            AccountsVoucher.countDocuments(filter)
        ]);

        console.log(vouchers)
        // Manual population for dynamic references
        for (let voucher of vouchers) {
            // Populate credit
            if (voucher.credit?.id && voucher.credit?.model) {
                try {
                    const CreditModel = mongoose.model(voucher.credit.model);
                    const creditDoc = await CreditModel.findById(voucher.credit.id)
                        .select('accountName name')
                        .lean();
                    voucher.credit.id = creditDoc;
                } catch (error) {
                    console.log(`Error populating credit for voucher ${voucher._id}:`, error.message);
                    // Keep the original ObjectId if population fails
                }
            }

            // Populate debit
            if (voucher.debit?.id && voucher.debit?.model) {
                try {
                    const DebitModel = mongoose.model(voucher.debit.model);
                    const debitDoc = await DebitModel.findById(voucher.debit.id)
                        .select('accountName name')
                        .lean();
                    voucher.debit.id = debitDoc;
                } catch (error) {
                    console.log(`Error populating debit for voucher ${voucher._id}:`, error.message);
                    // Keep the original ObjectId if population fails
                }
            }
        }

        const totalPages = Math.ceil(totalCount / limitNum);

        return {
            success: true,
            data: vouchers,
            pagination: {
                totalCount,
                totalPages,
                currentPage: pageNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
                limit: limitNum
            }
        };
    } catch (error) {
        throw new Error(`Error fetching vouchers: ${error.message}`);
    }
};

export const deleteVoucherById = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.query;

    if (!id) {
        throw new Error(400, 'Voucher ID is required');
    }

    if (!companyId) {
        throw new Error(400, 'Company ID is required for security');
    }

    // Check if voucher exists and belongs to the company
    const voucher = await AccountsVoucher.findOneAndUpdate({
        _id: id,
        companyId: companyId
    }, {
        isDeleted: true
    });

    if (!voucher) {
        throw new Error(404, 'Voucher not found or access denied');
    }

    return {
        message: 'Voucher deleted successfully'
    };
}