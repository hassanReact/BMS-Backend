import AppDataSource from "../core/database/data-source.js";
import { In, MoreThan } from "typeorm";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";

const accountsPayableRepository = AppDataSource.getRepository("AccountsPayable");
const unifiedVoucherRepository = AppDataSource.getRepository("UnifiedVoucher");


export const getAccountsPayable = async (req, res) => {
    const companyId = req.query.id;

    if (!companyId) {
        return res.status(400).json({
            message: "Company ID is required.",
            errorCode: "missing_company_id"
        });
    }

    try {
        const accountsPayable = await unifiedVoucherRepository.find({
            where: {
                companyId,
                isDeleted: false,
                voucherType: In(['SP', 'PUR']),
                status: 'pending',
                paymentStatus: In(['pending', 'partial', 'overdue']),
                outstandingAmount: MoreThan(0)
            }
        });

        if (!accountsPayable || accountsPayable.length === 0) {
            return res.status(200).json([]);
        }

        return accountsPayable;
    } catch (error) {
        console.error('Error in getAccountsPayable:', error);
        throw new CustomError(
            statusCodes?.internalServerError || 500,
            "Failed to fetch accounts payable",
            errorCodes?.internal_server_error || "internal_error"
        );
    }
}

export const getAccountsPayableById = async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({
            message: "Accounts Payable ID is required.",
            errorCode: "missing_id"
        });
    }

    const data = await accountsPayableRepository.findOne({
        where: {
            id,
            isDeleted: false
        }
    });

    if (!data) {
        throw new CustomError(
            statusCodes?.notFound,
            Message?.notFound,
            errorCodes?.not_found
        );
    }

    res.status(200).json(data);
};

export const postVoucherForVendor = async (req, res) => {
    const {
        voucherType,
        _id,
        voucherNo,
        companyId,
        date,
        month,
        particulars,
        debit,
        credit,
        amount,
        sourceDocument,
        tags,
        status
    } = req.body;

    if (!voucherNo) {
        throw new CustomError(400, 'voucherNo is required');
    }

    if (!credit?.accountId) {
        throw new CustomError(400, 'Credit account is required');
    }
    if (!companyId) {
        throw new CustomError(400, 'companyId is required');
    }

    // Remove _id from data to avoid duplicate key error
    const voucherData = {
        voucherType,
        voucherNo,
        companyId,
        date: date || new Date(),
        month,
        particulars,
        debit: {
            accountId: debit.accountId,
            accountType: debit.accountType,
            accountName: debit.accountName
        },
        credit: {
            accountId: credit.accountId,
            accountType: credit.accountType,
            accountName: credit.accountName
        },
        amount,
        sourceDocument,
        tags: tags || [],
        status: status || 'approved'
    };

    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
        throw new CustomError(400, 'Invalid amount provided', 'invalid_amount');
    }

    const newVoucher = unifiedVoucherRepository.create(voucherData);
    await unifiedVoucherRepository.save(newVoucher);

    // Update the existing voucher if _id was provided
    if (_id) {
        const updatedPayable = await unifiedVoucherRepository.findOne({
            where: {
                id: _id,
                companyId,
                isDeleted: false
            }
        });

        if (updatedPayable) {
            await unifiedVoucherRepository.update(
                { id: _id, companyId, isDeleted: false },
                { status: 'paid', paymentStatus: 'paid' }
            );
        }

        if (!updatedPayable) {
            console.warn(`No pending UnifiedVoucher found for ID: ${_id}`);
        }
 
    }

    if (!newVoucher) {
        throw new CustomError(
            statusCodes?.notFound,
            Message?.notFound,
            errorCodes?.not_found
        );
    }
    return newVoucher;
};

export const postVoucherForPurchase = async (req, res) => {
    const {
        voucherType,
        _id,
        voucherNo,
        companyId,
        date,
        month,
        particulars,
        debit,
        credit,
        amount,
        sourceDocument,
        tags,
        status,
        Details
    } = req.body;

    try {
        // Generate voucherNo if not provided
        let finalVoucherNo = voucherNo;
        if (!voucherNo) {
            // Generate a voucher number based on voucherType
            const finalVoucherType = voucherType || 'PUR';
            const timestamp = Date.now().toString().slice(-7);
            finalVoucherNo = `${finalVoucherType}-${timestamp}`;
        }

        if (!companyId) {
            throw new CustomError(400, 'companyId is required');
        }

        // If _id is provided, this is a payment against existing voucher
        if (_id) {
            // Update the purchase record status to paid
            const update = await unifiedVoucherRepository.findOne({
                where: {
                    id: _id,
                    companyId,
                    isDeleted: false
                }
            });

            if (!update) {
                console.log(update);
                throw new CustomError(
                    statusCodes?.badRequest,
                    "Failed to update purchase record",
                    "purchase_record_update_failed"
                );
            }

            // Ensure amount values are valid numbers
            const currentTotal = Number(update.amount) || 0;
            const currentOutstanding = Number(update.outstandingAmount ?? currentTotal) || 0;
            const paymentAmount = Number(amount) || 0;

            const newPendingAmount = currentOutstanding - paymentAmount;
            const newPaidAmount = currentTotal - Math.max(0, newPendingAmount);

            let paymentStatus;
            let voucherStatus;
            if (newPendingAmount <= 0) {
                paymentStatus = 'paid';
                voucherStatus = 'approved'
            } else if (newPaidAmount > 0 && newPendingAmount > 0) {
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

            // Create payment voucher
            const data = unifiedVoucherRepository.create({
                voucherNo: finalVoucherNo,
                voucherType: voucherType || 'PUR', // Purchase voucher
                companyId,
                date: date || new Date(),
                month: month,
                particulars: particulars || `Payment for purchase`,
                debit: {
                    accountId: debit?.accountId,
                    accountType: debit?.accountType || 'TransactionAccount',
                    accountName: debit?.accountName || 'Cash/Bank'
                },
                credit: {
                    accountId: credit?.accountId,
                    accountType: credit?.accountType || 'Vendor',
                    accountName: credit?.accountName || 'Vendor Account'
                },
                amount: paymentAmount,
                outstandingAmount: 0,
                totalAmountOwed: paymentAmount,
                sourceDocument: sourceDocument || {
                    referenceId: _id,
                    referenceModel: 'PurchaseDetails'
                },
                status: status || 'approved',
                paymentStatus: 'paid',
                tags: tags || ['Payment', 'Purchase'],
                details: Details || `Payment for purchase`
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
                voucherType: voucherType || 'PUR',
                companyId,
                date: date || new Date(),
                month: month,
                particulars: particulars || Details || 'Purchase voucher created',
                debit: debit,
                credit: credit,
                amount: amount,
                status: status || 'draft',
                tags: tags || ['Voucher', voucherType || 'PUR'],
                details: Details || 'Purchase voucher created'
            };

            // Add optional fields if they exist
            if (sourceDocument) voucherData.sourceDocument = sourceDocument;

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
        console.error('Error in postVoucherForPurchase:', error);
        throw error;
    }
};


export const postVoucherForServiceProvider = async (req, res) => {
    const { voucherNo, date, TransactionId, amount, Details, companyId, propertyId, month, _id, voucherType, particulars, debit, credit, status, ServiceProviderId } = req.body;

    try {
        // Generate voucherNo if not provided
        let finalVoucherNo = voucherNo;
        if (!voucherNo) {
            // Generate a voucher number based on voucherType
            const finalVoucherType = voucherType || 'JV';
            const timestamp = Date.now().toString().slice(-7);
            finalVoucherNo = `${finalVoucherType}-${timestamp}`;
        }

        // If _id is provided, this is a payment against existing voucher
        if (_id) {
            // Update the maintenance record status to paid
            const update = await unifiedVoucherRepository.findOne({
                where: {
                    id: _id,
                    companyId,
                    isDeleted: false
                }
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
            const newPaidAmount = currentTotal - Math.max(0, newPendingAmount);

            let paymentStatus;
            let voucherStatus;
            if (newPendingAmount <= 0) {
                paymentStatus = 'paid';
                voucherStatus = 'approved'
            } else if (newPaidAmount > 0 && newPendingAmount > 0) {
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

            // Create payment voucher
            const data = unifiedVoucherRepository.create({
                voucherNo: finalVoucherNo,
                voucherType: 'SP', // Service Provider voucher
                companyId,
                date: date || new Date(),
                month: month,
                particulars: `Payment for service provider`,
                debit: {
                    accountId: TransactionId || req.body.debit?.accountId,
                    accountType: 'Account',
                    accountName: req.body.debit?.accountName || 'Cash/Bank'
                },
                credit: {
                    accountId: ServiceProviderId || req.body.credit?.accountId,
                    accountType: 'ServiceProvider',
                    accountName: req.body.credit?.accountName || 'Service Provider Account'
                },
                amount: paymentAmount,
                outstandingAmount: 0,
                totalAmountOwed: paymentAmount,
                sourceDocument: {
                    referenceId: _id,
                    referenceModel: 'ServiceProvider'
                },
                status: 'approved',
                paymentStatus: 'paid',
                tags: ['Payment', 'ServiceProvider'],
                details: Details || `Payment for service provider`
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
            // Construct debit and credit objects if not provided
            const debitObj = debit || {
                accountId: TransactionId || companyId,
                accountType: 'Account',
                accountName: 'Cash/Bank Account'
            };
            
            const creditObj = credit || {
                accountId: ServiceProviderId,
                accountType: 'ServiceProvider',
                accountName: 'Service Provider Account'
            };
            
            // Ensure amount is a valid number
            const paymentAmount = Number(req.body.amount) || 0;
            if (isNaN(paymentAmount) || paymentAmount <= 0) {
                throw new CustomError(
                    statusCodes?.badRequest,
                    "Invalid amount provided",
                    "invalid_amount"
                );
            }
            
            const voucherData = {
                voucherNo: finalVoucherNo,
                voucherType: voucherType || 'SP',
                companyId,
                date: date || new Date(),
                month: month,
                particulars: particulars || Details || 'Service Provider voucher created',
                debit: debitObj,
                credit: creditObj,
                amount: paymentAmount,
                outstandingAmount: paymentAmount,
                totalAmountOwed: paymentAmount,
                paymentStatus: 'pending',
                status: status || 'draft',
                tags: ['Voucher', voucherType || 'SP'],
                details: Details || 'Service Provider voucher created'
            };

            // Add optional fields if they exist
            if (req.body.sourceDocument) voucherData.sourceDocument = req.body.sourceDocument;

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
        console.error('Error in postVoucherForServiceProvider:', error);
        throw error;
    }
};

