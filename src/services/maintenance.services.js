import AppDataSource from "../core/database/data-source.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";

const maintenanceRepository = AppDataSource.getRepository("Maintenance");
const propertyRepository = AppDataSource.getRepository("Property");
const unifiedVoucherRepository = AppDataSource.getRepository("UnifiedVoucher");

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

    const maintenance = maintenanceRepository.create({
        propertyType,
        maintenanceAmount,
        surchargeAmount,
        date,
        dueDate,
        maintenanceMonth,
        companyId
    });
    await maintenanceRepository.save(maintenance);

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

    const maintenance = await maintenanceRepository.findOne({ where: { id: maintenanceId } });
    const updatedMaintenance = maintenance
        ? await maintenanceRepository.save(Object.assign(maintenance, updateData))
        : null;

    if (!updatedMaintenance) {
        throw new CustomError(
            statusCodes?.notFound,
            Message?.notFound,
            errorCodes?.not_found
        );
    }

    // Update related UnifiedVouchers
    await unifiedVoucherRepository
        .createQueryBuilder()
        .update()
        .set({
            amount: () => "jsonb_set(jsonb_set(amount, '{total}', to_jsonb(CAST(:maintenanceAmount AS numeric)), true), '{balance}', to_jsonb((amount->>'balance')::numeric - CAST(:maintenanceAmount AS numeric)), true)",
            date: date,
            month: maintenanceMonth,
            particulars: `Maintenance Service for ${maintenanceMonth}`,
            details: `Maintenance service provided for ${maintenanceMonth}`
        })
        .where("source_document->>'referenceId' = :maintenanceId", { maintenanceId })
        .andWhere("source_document->>'referenceModel' = :referenceModel", { referenceModel: "Maintenance" })
        .setParameter("maintenanceAmount", maintenanceAmount)
        .execute();

    return updatedMaintenance;
};

export const deleteMaintenance = async (req, res) => {
    const maintenance = req.query.id;

    const maintenanceData = await maintenanceRepository.findOne({ where: { id: maintenance } });
    if (!maintenanceData) {
        throw new CustomError(
            statusCodes?.notFound,
            Message?.notFound,
            errorCodes?.not_found
        );
    }

    maintenanceData.isDeleted = true;
    await maintenanceRepository.save(maintenanceData);

    return maintenanceData
};

export const getMaintenance = async (req, res) => {
    const companyId = req.query.id;

    const maintenance = await maintenanceRepository.find({
        where: {
            companyId,
            isDeleted: false,
        },
        order: { createdAt: "DESC" },
    });

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
        // Debug: Log the search criteria
        console.log('Search criteria:', {
            companyId,
            maintenanceMonth,
            isDeleted: false,
            isVacant: false
        });

        // First, let's check if there are any properties at all for this company
        const allProperties = await propertyRepository.find({ where: { companyId, isDeleted: false } });
        console.log(`Total properties for company: ${allProperties.length}`);

        // Check properties by vacancy status
        const vacantProperties = await propertyRepository.find({ where: { companyId, isDeleted: false, isVacant: true } });
        const occupiedProperties = await propertyRepository.find({ where: { companyId, isDeleted: false, isVacant: false } });
        console.log(`Vacant properties: ${vacantProperties.length}`);
        console.log(`Occupied properties: ${occupiedProperties.length}`);

        const OccupiedProperties = await propertyRepository
            .createQueryBuilder("property")
            .where("property.company_id = :companyId", { companyId })
            .andWhere("property.is_deleted = false")
            .andWhere("property.is_vacant = false")
            .andWhere(
                "NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(property.maintencance_history, '[]'::jsonb)) AS history WHERE history->>'Month' = :maintenanceMonth)",
                { maintenanceMonth }
            )
            .getMany();

        console.log(`Properties without maintenance for ${maintenanceMonth}: ${OccupiedProperties.length}`);

        if (!OccupiedProperties.length) {
            // Let's check what properties exist and their maintenance history
            const propertiesWithHistory = await propertyRepository.find({
                where: {
                    companyId,
                    isDeleted: false,
                    isVacant: false
                }
            });

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
                const voucher = unifiedVoucherRepository.create({
                    voucherNo: voucherNo,
                    voucherType: 'MDN', // Maintenance
                    companyId,
                    date: date || new Date(),
                    month: maintenanceMonth,
                    particulars: `Maintenance Service for ${property.propertyname}`,
                    debit: {
                        accountId: property.id, // Property/Customer account
                        accountType: 'Property',
                        accountName: property.propertyname
                    },
                    credit: {
                        accountId: companyId, // Company revenue account
                        accountType: 'Company',
                        accountName: 'Company'
                    },
                    amount: Number(maintenanceAmount) || 0,
                    outstandingAmount: Number(maintenanceAmount) || 0,
                    totalAmountOwed: Number(maintenanceAmount) || 0,
                    surchargeAmount: 0,
                    propertyId: property.id,
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
                await unifiedVoucherRepository.save(voucher);

                console.log(`Created voucher with ID: ${voucher.id}`);

                // Update Property's maintencanceHistory
                property.maintencanceHistory = [
                    ...(property.maintencanceHistory || []),
                    {
                        Month: maintenanceMonth,
                        status: "Pending",
                        maintenanceId: _id,
                        voucherId: voucher.id
                    }
                ];
                await propertyRepository.save(property);

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