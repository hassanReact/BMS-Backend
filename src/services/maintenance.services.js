import Maintenance from "../models/maintenance.model.js"
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import Property from "../models/property.model.js";
import UnifiedVoucher from "../models/UnifiedVoucher.model.js";

export const createMaintenance = async (req, res) => {
    const {
        propertyType,
        maintenanceAmount,
        surchargeAmount,
        date,
        dueDate,
        maintenanceMonth,
        companyId
    } = req.body

    const maintenance = await Maintenance.create({
        propertyType,
        maintenanceAmount,
        surchargeAmount,
        date,
        dueDate,
        maintenanceMonth,
        companyId
    });

    return maintenance;
}

export const editMaintenance = async (req, res) => {
    const maintenanceId = req.query.id;

    if (!maintenanceId) {
        throw new CustomError(
            statusCodes?.badRequest,
            "maintenanceId is required.",
            errorCodes?.validation_error
        );
    }

    const {
        propertyType,
        maintenanceAmount,
        surchargeAmount,
        date,
        dueDate,
        maintenanceMonth,
        companyId
    } = req.body;

    const updateData = {
        propertyType,
        maintenanceAmount,
        surchargeAmount,
        date,
        dueDate,
        maintenanceMonth,
        companyId
    };

    const updatedMaintenance = await Maintenance.findByIdAndUpdate(
        maintenanceId,
        updateData,
        { new: true, runValidators: true }
    );

    if (!updatedMaintenance) {
        throw new CustomError(
            statusCodes?.notFound,
            Message?.notFound,
            errorCodes?.not_found
        );
    }

    // Update related UnifiedVouchers
    await UnifiedVoucher.updateMany(
        {
            'sourceDocument.referenceId': maintenanceId,
            'sourceDocument.referenceModel': 'Maintenance'
        },
        {
            $set: {
                'amount.total': maintenanceAmount,
                'amount.balance': { $subtract: ['$amount.balance', maintenanceAmount] },
                date: date,
                month: maintenanceMonth,
                particulars: `Maintenance Service for ${maintenanceMonth}`,
                details: `Maintenance service provided for ${maintenanceMonth}`
            }
        }
    );

    return updatedMaintenance;
};

export const deleteMaintenance = async (req, res) => {
    const maintenance = req.query.id;

    const maintenanceData = await Maintenance.findById(maintenance);
    if (!maintenanceData) {
        throw new CustomError(
            statusCodes?.notFound,
            Message?.notFound,
            errorCodes?.not_found
        );
    }

    maintenanceData.isDeleted = true;
    await maintenanceData.save();

    return maintenanceData
};

export const getMaintenance = async (req, res) => {
    const companyId = req.query.id;

    const maintenance = await Maintenance.find({
        companyId,
        isDeleted: false,
    }).sort({ createdAt: -1 });

    if (!maintenance) {
        throw new CustomError(
            statusCodes?.notFound,
            Message?.notFound,
            errorCodes?.not_found
        );
    }
    return maintenance
}

export const applyToOccupied = async (req, res) => {
    const {
        maintenanceAmount,
        date,
        maintenanceMonth,
        companyId,
        _id,
        voucherNo
    } = req.body;

    try {
        // Debug: Log which model we're using
        console.log('Using model:', UnifiedVoucher.modelName);
        console.log('Collection name:', UnifiedVoucher.collection.name);

        // Debug: Log the search criteria
        console.log('Search criteria:', {
            companyId,
            maintenanceMonth,
            isDeleted: false,
            isVacant: false
        });

        // First, let's check if there are any properties at all for this company
        const allProperties = await Property.find({ companyId, isDeleted: false });
        console.log(`Total properties for company: ${allProperties.length}`);

        // Check properties by vacancy status
        const vacantProperties = await Property.find({ companyId, isDeleted: false, isVacant: true });
        const occupiedProperties = await Property.find({ companyId, isDeleted: false, isVacant: false });
        console.log(`Vacant properties: ${vacantProperties.length}`);
        console.log(`Occupied properties: ${occupiedProperties.length}`);

        const OccupiedProperties = await Property.find({
            companyId,
            isDeleted: false,
            isVacant: false,
            maintencanceHistory: {
                $not: { $elemMatch: { Month: maintenanceMonth } }
            }
        });

        console.log(`Properties without maintenance for ${maintenanceMonth}: ${OccupiedProperties.length}`);

        if (!OccupiedProperties.length) {
            // Let's check what properties exist and their maintenance history
            const propertiesWithHistory = await Property.find({
                companyId,
                isDeleted: false,
                isVacant: false
            }).select('propertyname maintencanceHistory');

            console.log('Properties with maintenance history:', propertiesWithHistory.map(p => ({
                name: p.propertyname,
                history: p.maintencanceHistory
            })));

            throw new CustomError(statusCodes?.notFound, Message?.notFound, errorCodes?.not_found);
        }

        const createdVouchers = [];

        // Use Promise.all to process all properties in parallel and collect results
        await Promise.all(
            OccupiedProperties.map(async (property) => {
                // Generate unique voucher number for each property


                // Create Unified Voucher (Maintenance) for each property
                const voucher = await UnifiedVoucher.create({
                    voucherNo: voucherNo,
                    voucherType: 'MDN', // Maintenance
                    companyId,
                    date: date || new Date(),
                    month: maintenanceMonth,
                    particulars: `Maintenance Service for ${property.propertyname}`,
                    debit: {
                        accountId: property._id, // Property/Customer account
                        accountType: 'Property',
                        accountName: property.propertyname
                    },
                    credit: {
                        accountId: companyId, // Company revenue account
                        accountType: 'Company',
                        accountName: 'Company'
                    },
                    "amount.total": maintenanceAmount,
                    "amount.balance": maintenanceAmount,
                    propertyId: property._id,
                    propertyName: property.propertyname,
                    sourceDocument: {
                        referenceId: _id,
                        referenceModel: 'Maintenance'
                    },
                    status: 'pending',
                    paymentStatus: 'pending',
                    tags: ['Maintenance', 'Service', maintenanceMonth],
                    details: `Maintenance service provided for ${maintenanceMonth}`
                });

                console.log(`Created voucher with ID: ${voucher._id}`);

                // Update Property's maintencanceHistory
                await Property.updateOne(
                    { _id: property._id },
                    {
                        $push: {
                            maintencanceHistory: {
                                Month: maintenanceMonth,
                                status: "Pending",
                                maintenanceId: _id,
                                voucherId: voucher._id // Link to the voucher
                            }
                        }
                    }
                );

                createdVouchers.push(voucher);
            })
        );

        return {
            success: true,
            message: `Created ${createdVouchers.length} maintenance service vouchers`,
            data: {
                vouchers: createdVouchers,
                count: createdVouchers.length,
                maintenanceMonth,
                totalAmount: createdVouchers.length * maintenanceAmount
            }
        };
    } catch (error) {
        console.error('Error in applyToOccupied:', error);
        throw error;
    }

};