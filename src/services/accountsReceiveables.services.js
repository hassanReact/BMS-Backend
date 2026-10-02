import AppDataSource from "../core/database/data-source.js";
import { In, MoreThan } from "typeorm";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";

const accountsReceivableRepository = AppDataSource.getRepository("AccountsReceivable");
const accountVoucherRepository = AppDataSource.getRepository("AccountVoucher");
const billRepository = AppDataSource.getRepository("Bill");
const propertyRepository = AppDataSource.getRepository("Property");
const unifiedVoucherRepository = AppDataSource.getRepository("UnifiedVoucher");
const vendorRepository = AppDataSource.getRepository("Vendor");
const transactionalAccountRepository = AppDataSource.getRepository("TranstionalAccounts");
const staffRepository = AppDataSource.getRepository("Staff");
const serviceProviderRepository = AppDataSource.getRepository("ServiceProvider");

export const getAllReceives = async (req, res) => {
    const companyId = req.query.companyId;

    const data = await unifiedVoucherRepository.find({
        where: {
            companyId,
            isDeleted: false,
            voucherType: In(['MDN', 'PU']),
            outstandingAmount: MoreThan(0),
            status: 'pending',
            paymentStatus: In(['pending', 'partial', 'overdue'])
        }
    });

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
        const {
            voucherNo,
            voucherType,
            companyId,
            date,
            month,
            particulars,
            debit,
            credit,
            amount,
            propertyId,
            TransactionId,
            Details,
            status
        } = req.body;

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
            const update = await unifiedVoucherRepository.findOne({
                where: { id: _id, companyId, isDeleted: false }
            });


            if (!update) {
                console.log(update);
                throw new CustomError(
                    statusCodes?.badRequest,
                    "Failed to update maintenance record",
                    "maintenance_record_update_failed"
                );
            }
            
            // Ensure amount values are valid numbers
            const currentTotal = Number(update.amount) || 0;
            const currentOutstanding = Number(update.outstandingAmount ?? currentTotal) || 0;
            const paymentAmount = Number(amount) || 0;

            const newPendingAmount = currentOutstanding - paymentAmount;
            
            let paymentStatus;
            let voucherStatus;
            if (newPendingAmount <= 0) {
                paymentStatus = 'paid';
                voucherStatus = 'approved'
            } else if (paymentAmount > 0 && newPendingAmount > 0) {
                paymentStatus = 'partial';
                voucherStatus = 'pending'
            } else {
                paymentStatus = 'pending';
                voucherStatus = 'pending'
            }

            await unifiedVoucherRepository.update(
                { id: update.id, companyId, isDeleted: false },
                {
                    outstandingAmount: Math.max(0, newPendingAmount),
                    lastPaymentAmount: paymentAmount,
                    lastPaymentDate: date || new Date(),
                    paymentStatus,
                    status: voucherStatus
                }
            );
            // Update property maintenance history
            const property = await propertyRepository.findOne({
                where: { id: propertyId }
            });
            if (property?.maintencanceHistory) {
                property.maintencanceHistory = property.maintencanceHistory.map((history) =>
                    String(history.voucherId) === String(_id)
                        ? { ...history, status: "Paid" }
                        : history
                );
                await propertyRepository.save(property);
            }

            // Create payment voucher
            const data = unifiedVoucherRepository.create({
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
                amount: paymentAmount,
                outstandingAmount: 0,
                totalAmountOwed: paymentAmount,
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
            await unifiedVoucherRepository.save(data);

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

            if (typeof amount !== 'number' || !Number.isFinite(amount)) {
                throw new CustomError(400, 'Invalid amount provided', 'invalid_amount');
            }

            voucherData.amount = amount;
            voucherData.outstandingAmount = amount;
            voucherData.totalAmountOwed = amount;
            voucherData.paymentStatus = 'pending';

            const data = unifiedVoucherRepository.create(voucherData);
            await unifiedVoucherRepository.save(data);

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
        const updatedReceivable = await accountsReceivableRepository.update(
            queryConditions,
            { status: "Paid" }
        );
        console.log("AccountsReceivable update result:", updatedReceivable);

        if (updatedReceivable.matchedCount === 0) {
            // Check what records exist for debugging
            const existingRecord = await accountsReceivableRepository.findOne({
                where: {
                    referenceId: billId,
                    companyId,
                    isDeleted: false
                }
            });
            console.error("No pending bill found for the given criteria", {
                billId, companyId, existingRecord
            });
            
            // Handle the case where bill is already paid
            if (existingRecord && existingRecord.status === 'Paid') {
                // Check if voucher already exists for this bill
                const existingVoucher = await accountVoucherRepository.findOne({
                    where: {
                        referenceId: billId,
                        models: 'Bill',
                        companyId,
                        isDeleted: false
                    }
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
        const voucherData = accountVoucherRepository.create({
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
        await accountVoucherRepository.save(voucherData);
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
            await billRepository.update(
                { id: billId },
                { status: true }
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

        // Helper function to get debit and credit amounts from voucher
        const getVoucherAmounts = (voucher) => {
            let debitAmt = 0;
            let creditAmt = 0;

            const transactionAmount = Number(voucher.amount) || 0;

            // Check if this voucher affects our target model as debit
            if (voucher.debit?.accountType === modelType &&
                voucher.debit?.accountId?.toString() === modelId) {
                debitAmt = transactionAmount;
            }

            // Check if this voucher affects our target model as credit
            if (voucher.credit?.accountType === modelType &&
                voucher.credit?.accountId?.toString() === modelId) {
                creditAmt = transactionAmount;
            }

            return { debitAmt, creditAmt };
        };

        // 1. Calculate opening balance (before fromDate)
        let openingBalance = 0;
        if (fromDate) {
            const openingEntries = await unifiedVoucherRepository
                .createQueryBuilder("voucher")
                .where("voucher.company_id = :companyId", { companyId })
                .andWhere("voucher.is_deleted = false")
                .andWhere("((voucher.debit->>'accountType' = :modelType AND voucher.debit->>'accountId' = :modelId) OR (voucher.credit->>'accountType' = :modelType AND voucher.credit->>'accountId' = :modelId))", { modelType, modelId })
                .andWhere("voucher.date < :fromDate", { fromDate: new Date(fromDate) })
                .getMany();

            openingEntries.forEach((voucher) => {
                const { debitAmt, creditAmt } = getVoucherAmounts(voucher);
                openingBalance += debitAmt - creditAmt;
            });
        }

        // 2. Fetch vouchers in date range
        const finalQuery = unifiedVoucherRepository
            .createQueryBuilder("voucher")
            .where("voucher.company_id = :companyId", { companyId })
            .andWhere("voucher.is_deleted = false")
            .andWhere("((voucher.debit->>'accountType' = :modelType AND voucher.debit->>'accountId' = :modelId) OR (voucher.credit->>'accountType' = :modelType AND voucher.credit->>'accountId' = :modelId))", { modelType, modelId })
            .orderBy("voucher.date", "ASC");

        if (fromDate) {
            finalQuery.andWhere("voucher.date >= :fromDate", { fromDate: new Date(fromDate) });
        }
        if (toDate) {
            finalQuery.andWhere("voucher.date <= :toDate", { toDate: new Date(toDate) });
        }

        const vouchers = await finalQuery.getMany();

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
                voucherId: voucher.id || null,
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
        const balanceData = await unifiedVoucherRepository
            .createQueryBuilder("voucher")
            .select("COALESCE(SUM(CASE WHEN voucher.credit->>'accountId' = :accountId AND voucher.credit->>'accountType' = :accountType THEN voucher.amount ELSE 0 END), 0)", "totalCredit")
            .addSelect("COALESCE(SUM(CASE WHEN voucher.debit->>'accountId' = :accountId AND voucher.debit->>'accountType' = :accountType THEN voucher.amount ELSE 0 END), 0)", "totalDebit")
            .addSelect("COUNT(*)", "transactionCount")
            .where("voucher.company_id = :companyId", { companyId })
            .andWhere("((voucher.credit->>'accountId' = :accountId AND voucher.credit->>'accountType' = :accountType) OR (voucher.debit->>'accountId' = :accountId AND voucher.debit->>'accountType' = :accountType))", { accountId, accountType })
            .getRawOne();

        const totalCredit = Number(balanceData?.totalCredit || 0);
        const totalDebit = Number(balanceData?.totalDebit || 0);
        const balance = totalDebit - totalCredit;
        const normalizedBalanceData = balanceData ? {
            totalCredit,
            totalDebit,
            balance,
            balanceType: balance >= 0 ? 'Debit' : 'Credit',
            transactionCount: Number(balanceData.transactionCount || 0)
        } : {
            totalCredit: 0,
            totalDebit: 0,
            balance: 0,
            balanceType: 'Debit',
            transactionCount: 0
        };

        res.status(200).json({
            success: true,
            data: {
                ...normalizedBalanceData,
                balance: Math.abs(normalizedBalanceData.balance)
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
        const query = unifiedVoucherRepository
            .createQueryBuilder("voucher")
            .select("COALESCE(SUM(voucher.amount), 0)", "totalAmount")
            .addSelect("COUNT(*)", "totalTransactions")
            .addSelect("COALESCE(SUM(CASE WHEN voucher.credit->>'accountId' IS NOT NULL THEN voucher.amount ELSE 0 END), 0)", "totalCredit")
            .addSelect("COALESCE(SUM(CASE WHEN voucher.debit->>'accountId' IS NOT NULL THEN voucher.amount ELSE 0 END), 0)", "totalDebit")
            .addSelect("ARRAY_AGG(DISTINCT voucher.voucher_type)", "voucherTypes");

        if (companyId) {
            query.where("voucher.company_id = :companyId", { companyId });
        }
        if (accountType) {
            query.andWhere("(voucher.credit->>'accountType' = :accountType OR voucher.debit->>'accountType' = :accountType)", { accountType });
        }

        const result = await query.getRawOne();
        const summary = result ? {
            totalAmount: Number(result.totalAmount),
            totalTransactions: Number(result.totalTransactions),
            totalCredit: Number(result.totalCredit),
            totalDebit: Number(result.totalDebit),
            voucherTypes: result.voucherTypes || []
        } : {
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
        const voucherWithPopulatedRef = await unifiedVoucherRepository.findOne({
            where: { id: voucherId }
        });

        if (!voucherWithPopulatedRef) {
            throw new CustomError(
                statusCodes?.notFound,
                'Transaction not found',
                errorCodes?.not_found
            );
        }

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

    const vendor = await vendorRepository.find({
        select: { id: true, vendorName: true },
        where: { companyId, isDeleted: false }
    });

    return vendor.map(({ id, vendorName }) => ({ _id: id, vendorName }));
}

export const properties = async (req, res) => {
    const companyId = req.query.companyId;

    const properties = await propertyRepository.find({
        select: { id: true, propertyname: true },
        where: { companyId, isDeleted: false }
    });

    return properties.map(({ id, propertyname }) => ({ _id: id, propertyname }));
}

export const Staff = async (req, res) => {
    const companyId = req.query.companyId;

    const staffs = await staffRepository.find({
        select: { id: true, staffName: true },
        where: { companyId, isDeleted: false }
    });

    return staffs.map(({ id, staffName }) => ({ _id: id, staffName }));
}

export const service = async (req, res) => {
    const companyId = req.query.companyId;
    const ServiceProviders = await serviceProviderRepository.find({
        select: { id: true, name: true },
        where: { isDeleted: false, companyId }
    });
    console.log(ServiceProviders);
    return ServiceProviders.map(({ id, name }) => ({ _id: id, name }));
}

export const TransactionalsAccount = async (req, res) => {
    const companyId = req.query.companyId;
    const Accounts = await transactionalAccountRepository.find({
        select: { id: true, accountName: true, accountNumber: true },
        where: { companyId, isDeleted: false }
    });
    return Accounts.map(({ id, accountName, accountNumber }) => ({ _id: id, accountName, accountNumber }));
}

// Reverse a voucher entry
export const reverseVoucher = async (req, res) => {
    const { voucherId, reason } = req.body;

    try {
        // Find the original voucher
        const originalVoucher = await unifiedVoucherRepository.findOne({
            where: { id: voucherId }
        });

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
        const existingReverse = await unifiedVoucherRepository.findOne({
            where: { voucherNo: reverseVoucherNo }
        });
        if (existingReverse) {
            throw new CustomError(
                statusCodes?.badRequest,
                'Reverse voucher already exists',
                errorCodes?.bad_request
            );
        }

        // REV is not supported by the current UnifiedVoucher PostgreSQL enum.
        throw new CustomError(
            statusCodes?.badRequest,
            'Reverse voucher type is not supported',
            errorCodes?.bad_request
        );

    } catch (error) {
        console.error('reverseVoucher error:', error);
        throw error;
    }
}