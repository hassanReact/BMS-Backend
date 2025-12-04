import mongoose from "mongoose";
import { errorCodes, statusCodes } from "../core/common/constant.js";
import AccountsReceivable from "../models/accountsReceiveable.model.js";
import CustomError from "../utils/exception.js";
import Vendor from "../models/vendor.model.js";
import TransactionalAccounts from "../models/transactionalAccounts.model.js";
import staff from "../models/staff.model.js";
import Property from "../models/property.model.js";
import ServiceProvider from "../models/serviceprovider.model.js";
import UnifiedVoucher from "../models/UnifiedVoucher.model.js";
import Bill from "../models/billing.model.js";

export const getAllReceives = async (req, res) => {
    const companyId = req.query.companyId;

    const data = await UnifiedVoucher.find({
        companyId,
        isDeleted: false,
        voucherType: { $in: ['MDN', 'PU'] },
        "amount.balance" : { $gt : 0 },
        status: 'pending',
        paymentStatus: { $in : ['pending', 'partial', 'partial-paid', 'overdue']}
    }).populate('sourceDocument.referenceId credit.accountId debit.accountId');

    if (!data) {
        throw new CustomError(
            statusCodes?.notFound,
            Message?.notFound,
            errorCodes?.not_found
        )
    }

    return data
}

export const postVoucher = async (req, res) => {
    try {
        // Generate voucherNo if not provided
        let finalVoucherNo = voucherNo;
        if (!voucherNo) {
            // Generate a voucher number based on voucherType
            const finalVoucherType = voucherType || 'JV';
            const timestamp = Date.now().toString().slice(-6);
            finalVoucherNo = `${finalVoucherType}-${timestamp}`;
        }

        // If _id is provided, this is a payment against existing voucher
        if (_id) {
            // const voucherPrefix = finalVoucherNo.replace(/[^a-zA-Z]/g, '');

            // Update the maintenance record status to paid
            const update = await UnifiedVoucher.findOne(
                {
                    _id,
                    companyId,
                    isDeleted: false
                }
            );


            if (!update) {
                console.log(update);
                throw new CustomError(
                    statusCodes?.badRequest,
                    "Failed to update maintenance record",
                    "maintenance_record_update_failed"
                );
            }
            
            // Ensure amount values are valid numbers
            const currentTotal = Number(update.amount?.total) || 0;
            const currentPaid = Number(update.amount?.paid) || 0;
            const paymentAmount = Number(amount) || 0;
            
            const newPendingAmount = currentTotal - (currentPaid + paymentAmount);
            const newPaidAmount = currentPaid + paymentAmount;
            
            let paymentStatus;
            let voucherStatus;
            if (newPendingAmount <= 0) {
                paymentStatus = 'paid';
                voucherStatus = 'approved'
            } else if (newPaidAmount > 0 && newPendingAmount > 0) {
                paymentStatus = 'partial-paid';
                voucherStatus = 'pending'
            } else {
                paymentStatus = 'pending';
                voucherStatus = 'pending'
            }

            const updateData = {
                'amount.balance': Math.max(0, newPendingAmount),
                'amount.paid': newPaidAmount,
                paymentStatus: paymentStatus,
                status: voucherStatus
            };

            await UnifiedVoucher.updateOne(
                { _id: update._id },
                { $set: updateData }
            );
            // Update property maintenance history
            await Property.updateOne(
                {
                    _id: propertyId,
                    "maintencanceHistory.voucherId": _id
                },
                {
                    $set: {
                        "maintencanceHistory.$.status": "Paid"
                    }
                }
            );

            // Create payment voucher
            const data = await UnifiedVoucher.create({
                voucherNo: finalVoucherNo,
                voucherType: 'MDN', // Receipt voucher
                companyId,
                date: date || new Date(),
                month: month,
                particulars: `Payment received for maintenance service`,
                debit: {
                    accountId: req.body.debit?.accountId || TransactionId, // Use request debit account or fallback
                    accountType: 'Account', // Fixed: was 'TransactionalAccount'
                    accountName: req.body.debit?.accountName || 'Cash/Bank'
                },
                credit: {
                    accountId: propertyId, // Property account
                    accountType: 'Property',
                    accountName: 'Property Account'
                },
                amount: {
                    balance: 0,
                    total: paymentAmount,
                    paid: paymentAmount
                },
                propertyId: propertyId,
                sourceDocument: {
                    referenceId: _id,
                    referenceModel: 'Maintenance' // Fixed: was 'UnifiedVoucher'
                },
                status: 'approved',
                paymentStatus: 'paid', // Fixed: was 'completed'
                tags: ['Payment', 'Maintenance', 'Receipt'],
                details: Details || `Payment received for maintenance service`
            });

            if (!data) {
                throw new CustomError(
                    statusCodes?.badRequest,
                    "Failed to create payment voucher",
                    "voucher_creation_failed"
                );
            }

            return data;
        } else {
            // This is a request to create a new voucher
            const voucherData = {
                voucherNo: finalVoucherNo,
                voucherType: voucherType || 'JV',
                companyId,
                date: date || new Date(),
                month: month,
                particulars: particulars || Details || 'Voucher created',
                debit: debit,
                credit: credit,
                amount: amount,
                propertyId: propertyId,
                status: status || 'draft',
                tags: ['Voucher', voucherType || 'JV'],
                details: Details || 'Voucher created'
            };

            // Add optional fields if they exist
            if (req.body.sourceDocument) voucherData.sourceDocument = req.body.sourceDocument;
            if (req.body.propertyName) voucherData.propertyName = req.body.propertyName;

            const data = await UnifiedVoucher.create(voucherData);

            if (!data) {
                throw new CustomError(
                    statusCodes?.badRequest,
                    "Failed to create voucher",
                    "voucher_creation_failed"
                );
            }

            return data;
        }
    } catch (error) {
        console.error('Error in postVoucher:', error);
        throw error;
    }
}

export const postBillVoucher = async (req, res) => {
    try {
        const { 
            voucherNo,
            Date: requestDate,
            TransactionId,
            amount, 
            details, 
            Details,
            companyId, 
            propertyId, 
            month, 
            billId, 
            createdBy 
        } = req.body;

        // Normalize field names to handle different casing
        const normalizedDate = requestDate;
        const normalizedTransactionId = TransactionId;
        const normalizedDetails = details || Details;

        console.log("Received postBillVoucher request body:", req.body);

        // Validation
        if (!voucherNo || !requestDate || !TransactionId || !amount || !companyId || !propertyId || !month || !billId) {
            console.error("Validation failed: Missing required fields", {
                voucherNo, requestDate, TransactionId, amount, companyId, propertyId, month, billId
            });
            throw new CustomError(
                statusCodes?.badRequest || 400,
                "Missing required fields",
                errorCodes?.validation_error
            );
        }

        // Extract voucher prefix for voucherType
        const voucherPrefix = voucherNo.replace(/[^a-zA-Z]/g, '');

        // Simple query without month to avoid format mismatch issues
        const queryConditions = {
            referenceId: billId,
            referenceModel: 'Bill',
            companyId, 
            status: "Pending", 
            isDeleted: false,
            type: "Bill"
        };

        console.log("Query conditions for AccountsReceivable:", queryConditions);

        // Update AccountsReceivable status to Paid
        console.log("Updating AccountsReceivable status to Paid for billId:", billId);
        const updatedReceivable = await AccountsReceivable.updateOne(
            queryConditions,
            {
                status: "Paid"
            }
        );
        console.log("AccountsReceivable update result:", updatedReceivable);

        if (updatedReceivable.matchedCount === 0) {
            // Check what records exist for debugging
            const existingRecord = await AccountsReceivable.findOne({
                referenceId: billId,
                companyId,
                isDeleted: false
            });
            console.error("No pending bill found for the given criteria", {
                billId, companyId, existingRecord
            });
            
            // Handle the case where bill is already paid
            if (existingRecord && existingRecord.status === 'Paid') {
                // Check if voucher already exists for this bill
                const existingVoucher = await AccountsVoucher.findOne({
                    referenceId: billId,
                    models: 'Bill',
                    companyId,
                    isDeleted: false
                });
                
                if (existingVoucher) {
                    // Return the existing voucher instead of throwing error
                    return existingVoucher;
                }
                
                throw new CustomError(
                    statusCodes?.conflict || 409,
                    "Bill is already paid but voucher record is missing",
                    errorCodes?.conflict
                );
            }
            
            throw new CustomError(
                statusCodes?.notFound || 404,
                `No pending bill found. Status: ${existingRecord?.status || 'Not found'}`,
                errorCodes?.not_found
            );
        }

        // Create AccountsVoucher entry - EXACTLY like postVoucher
        console.log("Creating AccountsVoucher entry...");
        const voucherData = await AccountsVoucher.create({
            voucherNo,
            voucherType: voucherPrefix || 'REC',
            referenceId: billId,
            models: 'Bill',
            companyId,
            date: new Date(normalizedDate),
            amount: parseFloat(amount),
            details: normalizedDetails || 'Bill payment received',
            particulars: 'Bill Received',
            status: 'approved',
            createdBy,
            // SAME PATTERN AS postVoucher
            credit: {
                referenceId: propertyId,
                referenceModel: 'Property'
            },
            debit: {
                referenceId: normalizedTransactionId,
                referenceModel: 'Transaction'
            },
            isDeleted: false
        });
        console.log("AccountsVoucher created:", voucherData);

        if (!voucherData) {
            console.error("Failed to create voucher");
            throw new CustomError(
                statusCodes?.internalServerError || 500,
                "Failed to create voucher",
                errorCodes?.creation_failed
            );
        }

        // Update the Bill status as well
        console.log("Updating Bill status to Paid for billId:", billId);
        try {
            await Bill.updateOne(
                { _id: billId },
                { 
                    status: true, // or whatever your Bill model expects
                    paidDate: new Date(normalizedDate),
                    paidAmount: parseFloat(amount)
                }
            );
            console.log("Bill status updated successfully");
        } catch (billUpdateError) {
            console.error("Warning: Failed to update Bill status:", billUpdateError.message);
        }

        // Return the data (don't send response here)
        return voucherData;

    } catch (error) {
        console.error('Error in postBillVoucher:', error);
        throw error; // Let the controller handle the error response
    }
};

export const getLedgerReport = async (req, res) => {
    const { companyId, modelType, modelId, fromDate, toDate } = req.query;

    try {
        if (!companyId || !modelType || !modelId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: companyId, modelType, modelId'
            });
        }

        console.log('Ledger query params:', { companyId, modelType, modelId, fromDate, toDate });

        // Convert modelId to ObjectId if it's a valid ObjectId string
        const objectModelId = mongoose.Types.ObjectId.isValid(modelId) ?
            new mongoose.Types.ObjectId(modelId) : modelId;

        const modelMatch = {
            $or: [
                { "debit.accountType": modelType, "debit.accountId": objectModelId },
                { "credit.accountType": modelType, "credit.accountId": objectModelId },
            ],
        };

        const baseMatch = { companyId, isDeleted: false };

        // Helper function to get debit and credit amounts from voucher
        const getVoucherAmounts = (voucher) => {
            let debitAmt = 0;
            let creditAmt = 0;

            // Get the paid amount from voucher (prioritize amount.paid)
            const paidAmount = voucher.amount?.paid || voucher.amount || 0;

            // Check if this voucher affects our target model as debit
            if (voucher.debit?.accountType === modelType &&
                voucher.debit?.accountId?.toString() === modelId) {
                debitAmt = paidAmount;
            }

            // Check if this voucher affects our target model as credit
            if (voucher.credit?.accountType === modelType &&
                voucher.credit?.accountId?.toString() === modelId) {
                creditAmt = paidAmount;
            }

            return { debitAmt, creditAmt };
        };

        // 1. Calculate opening balance (before fromDate)
        let openingBalance = 0;
        if (fromDate) {
            const openingEntries = await UnifiedVoucher.find({
                ...baseMatch,
                ...modelMatch,
                date: { $lt: new Date(fromDate) },
            });

            openingEntries.forEach((voucher) => {
                const { debitAmt, creditAmt } = getVoucherAmounts(voucher);
                openingBalance += debitAmt - creditAmt;
            });
        }

        // 2. Fetch vouchers in date range
        const dateMatch = {};
        if (fromDate) dateMatch.$gte = new Date(fromDate);
        if (toDate) dateMatch.$lte = new Date(toDate);

        const finalQuery = {
            ...baseMatch,
            ...modelMatch,
            ...(fromDate || toDate ? { date: dateMatch } : {}),
        };

        console.log('Final query:', JSON.stringify(finalQuery, null, 2));

        const vouchers = await UnifiedVoucher.find(finalQuery)
            .sort({ date: 1 });

        console.log(`Found ${vouchers.length} vouchers for ledger`);

        // 3. Build ledger report
        let runningBalance = openingBalance;
        const report = [];

        // Add opening balance row if fromDate is specified
        if (fromDate && openingBalance !== 0) {
            report.push({
                date: fromDate,
                particulars: "Opening Balance",
                debit: openingBalance > 0 ? openingBalance : "",
                credit: openingBalance < 0 ? Math.abs(openingBalance) : "",
                balance: openingBalance,
                details: "Brought forward balance",
                voucherNo: "",
                voucherId: null,
            });
        }

        // Add transaction entries
        vouchers.forEach((voucher) => {
            const { debitAmt, creditAmt } = getVoucherAmounts(voucher);
            runningBalance += debitAmt - creditAmt;

            report.push({
                date: voucher.date,
                particulars: voucher.particulars || "",
                debit: debitAmt || "",
                credit: creditAmt || "",
                balance: runningBalance,
                details: voucher.details || "",
                voucherNo: voucher.voucherNo || "",
                voucherId: voucher._id || null,
                voucherType: voucher.voucherType,
                isReversed: voucher.voucherType === 'REV', // Flag for reversed entries
                sourceDocument: voucher.sourceDocument
            });
        });

        // 4. Add closing balance summary
        const totalDebits = report.reduce((sum, entry) => sum + (typeof entry.debit === 'number' ? entry.debit : 0), 0);
        const totalCredits = report.reduce((sum, entry) => sum + (typeof entry.credit === 'number' ? entry.credit : 0), 0);
        // 🔹 Conditionally reverse the report based on modelType
        const finalReport = modelType === 'Property' ? report.reverse() : report;

        res.status(200).json({
            success: true,
            data: finalReport,
            summary: {
                openingBalance,
                totalDebits,
                totalCredits,
                closingBalance: runningBalance,
                totalEntries: finalReport.length
            }
        });

    } catch (err) {
        console.error("Ledger fetch failed:", err);
        res.status(500).json({
            success: false,
            message: "Failed to get ledger data",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

// Get Account Balance for a specific account
export const getAccountBalance = async (req, res) => {
    const { accountId, accountType, companyId } = req.query;

    if (!accountId || !accountType) {
        throw new CustomError(
            statusCodes?.badRequest,
            'Account ID and Account Type are required',
            errorCodes?.bad_request
        );
    }

    try {
        const pipeline = [
            {
                $match: {
                    companyId: new mongoose.Types.ObjectId(companyId),
                    $or: [
                        {
                            'credit.accountId': new mongoose.Types.ObjectId(accountId),
                            'credit.accountType': accountType
                        },
                        {
                            'debit.accountId': new mongoose.Types.ObjectId(accountId),
                            'debit.accountType': accountType
                        }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalCredit: {
                        $sum: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $eq: ['$credit.accountId', new mongoose.Types.ObjectId(accountId)] },
                                        { $eq: ['$credit.accountType', accountType] }
                                    ]
                                },
                                then: '$amount',
                                else: 0
                            }
                        }
                    },
                    totalDebit: {
                        $sum: {
                            $cond: {
                                if: {
                                    $and: [
                                        { $eq: ['$debit.accountId', new mongoose.Types.ObjectId(accountId)] },
                                        { $eq: ['$debit.accountType', accountType] }
                                    ]
                                },
                                then: '$amount',
                                else: 0
                            }
                        }
                    },
                    transactionCount: { $sum: 1 }
                }
            },
            {
                $addFields: {
                    balance: { $subtract: ['$totalDebit', '$totalCredit'] },
                    balanceType: {
                        $cond: {
                            if: { $gte: [{ $subtract: ['$totalDebit', '$totalCredit'] }, 0] },
                            then: 'Debit',
                            else: 'Credit'
                        }
                    }
                }
            }
        ];

        const result = await UnifiedVoucher.aggregate(pipeline);
        const balanceData = result[0] || {
            totalCredit: 0,
            totalDebit: 0,
            balance: 0,
            balanceType: 'Debit',
            transactionCount: 0
        };

        res.status(200).json({
            success: true,
            data: {
                ...balanceData,
                balance: Math.abs(balanceData.balance) // Return absolute value
            },
            message: 'Account balance fetched successfully'
        });

    } catch (error) {
        console.error('getAccountBalance error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

export const getAccountsSummary = async (req, res) => {
    const { companyId, accountType } = req.query;

    try {
        const matchConditions = {
            ...(companyId ? { companyId: new mongoose.Types.ObjectId(companyId) } : {})
        };

        // Filter by account type if provided
        let accountFilter = {};
        if (accountType) {
            accountFilter = {
                $or: [
                    { 'credit.accountType': accountType },
                    { 'debit.accountType': accountType }
                ]
            };
        }

        const pipeline = [
            {
                $match: {
                    ...matchConditions,
                    ...accountFilter
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    totalTransactions: { $sum: 1 },
                    totalCredit: {
                        $sum: {
                            $cond: {
                                if: { $ne: ['$credit.accountId', null] },
                                then: '$amount',
                                else: 0
                            }
                        }
                    },
                    totalDebit: {
                        $sum: {
                            $cond: {
                                if: { $ne: ['$debit.accountId', null] },
                                then: '$amount',
                                else: 0
                            }
                        }
                    },
                    voucherTypes: { $addToSet: '$voucherType' }
                }
            }
        ];

        const result = await UnifiedVoucher.aggregate(pipeline);
        const summary = result[0] || {
            totalAmount: 0,
            totalTransactions: 0,
            totalCredit: 0,
            totalDebit: 0,
            voucherTypes: []
        };

        res.status(200).json({
            success: true,
            data: summary,
            message: 'Accounts summary fetched successfully'
        });

    } catch (error) {
        console.error('getAccountsSummary error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

export const getTransactionDetails = async (req, res) => {
    const { voucherId } = req.params;

    try {
        const pipeline = [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(voucherId)
                }
            },
            // Lookup for Credit Account Details
            {
                $lookup: {
                    from: 'properties',
                    localField: 'credit.accountId',
                    foreignField: '_id',
                    as: 'creditProperty'
                }
            },
            {
                $lookup: {
                    from: 'transactionalaccounts',
                    localField: 'credit.accountId',
                    foreignField: '_id',
                    as: 'creditTransaction'
                }
            },
            // Lookup for Debit Account Details
            {
                $lookup: {
                    from: 'properties',
                    localField: 'debit.accountId',
                    foreignField: '_id',
                    as: 'debitProperty'
                }
            },
            {
                $lookup: {
                    from: 'transactionalaccounts',
                    localField: 'debit.accountId',
                    foreignField: '_id',
                    as: 'debitTransaction'
                }
            },
            {
                $addFields: {
                    creditAccountDetails: {
                        $cond: {
                            if: { $eq: ['$credit.accountType', 'Property'] },
                            then: { $arrayElemAt: ['$creditProperty', 0] },
                            else: {
                                $cond: {
                                    if: { $eq: ['$credit.accountType', 'Account'] },
                                    then: { $arrayElemAt: ['$creditTransaction', 0] },
                                    else: null
                                }
                            }
                        }
                    },
                    debitAccountDetails: {
                        $cond: {
                            if: { $eq: ['$debit.accountType', 'Property'] },
                            then: { $arrayElemAt: ['$debitProperty', 0] },
                            else: {
                                $cond: {
                                    if: { $eq: ['$debit.accountType', 'Account'] },
                                    then: { $arrayElemAt: ['$debitTransaction', 0] },
                                    else: 0
                                }
                            }
                        }
                    }
                }
            }
        ];

        const result = await UnifiedVoucher.aggregate(pipeline);

        if (!result || result.length === 0) {
            throw new CustomError(
                statusCodes?.notFound,
                'Transaction not found',
                errorCodes?.not_found
            );
        }

        // Populate the sourceDocument.referenceId after aggregation
        const voucherWithPopulatedRef = await UnifiedVoucher.findById(voucherId)
            .populate('sourceDocument.referenceId');

        res.status(200).json({
            success: true,
            data: voucherWithPopulatedRef,
            message: 'Transaction details fetched successfully'
        });

    } catch (error) {
        console.error('getTransactionDetails error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

export const vendors = async (req, res) => {
    const companyId = req.query.companyId;

    const vendor = await Vendor.find({ companyId, isDeleted: false }).select('_id vendorName');

    return vendor
}

export const properties = async (req, res) => {
    const companyId = req.query.companyId;

    const properties = await Property.find({ companyId, isDeleted: false }).select('_id propertyname');

    return properties
}

export const Staff = async (req, res) => {
    const companyId = req.query.companyId;

    const staffs = await staff.find({ companyId, isDeleted: false }).select('_id staffName');

    return staffs
}

export const service = async (req, res) => {
    const companyId = req.query.companyId;
    const ServiceProviders = await ServiceProvider.find({ isDeleted: false, companyId }).select('_id name');
    console.log(ServiceProviders);
    return ServiceProviders;
}

export const TransactionalsAccount = async (req, res) => {
    const companyId = req.query.companyId;
    const Accounts = await TransactionalAccounts.find({ companyId, isDeleted: false }).select('_id accountName accountNumber');
    return Accounts;
}

// Reverse a voucher entry
export const reverseVoucher = async (req, res) => {
    const { voucherId, reason } = req.body;

    try {
        // Find the original voucher
        const originalVoucher = await UnifiedVoucher.findById(voucherId);

        if (!originalVoucher) {
            throw new CustomError(
                statusCodes?.notFound,
                'Original voucher not found',
                errorCodes?.not_found
            );
        }

        if (originalVoucher.isDeleted) {
            throw new CustomError(
                statusCodes?.badRequest,
                'Cannot reverse a deleted voucher',
                errorCodes?.bad_request
            );
        }

        // Generate reverse voucher number
        const reverseVoucherNo = `REV-${originalVoucher.voucherNo}`;

        // Check if reverse voucher already exists
        const existingReverse = await UnifiedVoucher.findOne({ voucherNo: reverseVoucherNo });
        if (existingReverse) {
            throw new CustomError(
                statusCodes?.badRequest,
                'Reverse voucher already exists',
                errorCodes?.bad_request
            );
        }

        // Create reverse voucher with swapped debit/credit
        const reverseVoucher = await UnifiedVoucher.create({
            voucherNo: reverseVoucherNo,
            voucherType: 'REV', // Reverse voucher type
            companyId: originalVoucher.companyId,
            date: new Date(),
            month: new Date().toISOString().slice(0, 7),
            particulars: `Reverse of ${originalVoucher.particulars}`,
            // Swap debit and credit to reverse the effect
            credit: {
                accountId: originalVoucher.debit.accountId,
                accountType: originalVoucher.debit.accountType,
                accountName: originalVoucher.debit.accountName
            },
            debit: {
                accountId: originalVoucher.credit.accountId,
                accountType: originalVoucher.credit.accountType,
                accountName: originalVoucher.credit.accountName
            },
            amount: originalVoucher.amount,
            propertyId: originalVoucher.propertyId,
            propertyName: originalVoucher.propertyName,
            status: 'approved',
            tags: ['Reverse', 'Voucher'],
            details: `Reverse entry: ${reason || 'No reason provided'}. Original voucher: ${originalVoucher.voucherNo}`,
            isDeleted: false
        });

        // Update AccountsReceivable status back to Pending if this was a maintenance payment
        if (originalVoucher.tags && originalVoucher.tags.includes('Maintenance')) {
            // Find and update maintenance vouchers
            await UnifiedVoucher.updateMany(
                {
                    companyId: originalVoucher.companyId,
                    tags: { $in: ['Maintenance'] },
                    status: "approved",
                    isDeleted: false
                },
                { status: "pending" }
            );
        }

        return {
            success: true,
            data: {
                originalVoucher,
                reverseVoucher
            },
            message: 'Voucher reversed successfully'
        };

    } catch (error) {
        console.error('reverseVoucher error:', error);
        throw error;
    }
}