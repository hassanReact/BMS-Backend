import AppDataSource from "../core/database/data-source.js";

const accountVoucherRepository = AppDataSource.getRepository("AccountVoucher");

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

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit))); // Limit max to 100
    const skip = (pageNum - 1) * limitNum;

    try {
        const query = accountVoucherRepository
            .createQueryBuilder("voucher")
            .leftJoinAndSelect("voucher.company", "company")
            .where("voucher.company_id = :companyId", { companyId })
            .andWhere("voucher.is_deleted = false");

        if (voucherType) {
            query.andWhere("voucher.voucher_type = :voucherType", { voucherType });
        }

        if (search) {
            query.andWhere(
                "voucher.voucher_no ILIKE :search OR voucher.particulars ILIKE :search OR voucher.details ILIKE :search",
                { search: `%${search}%` }
            );
        }

        if (startDate || endDate) {
            let start;
            let end;
            if (startDate) {
                start = new Date(startDate);
                if (isNaN(start.getTime())) {
                    throw new Error('Invalid start date format');
                }
            }
            if (endDate) {
                end = new Date(endDate);
                if (isNaN(end.getTime())) {
                    throw new Error('Invalid end date format');
                }
                // Set to end of day
                end.setHours(23, 59, 59, 999);
            }
            query.andWhere("voucher.date BETWEEN :start AND :end", {
                start: start || new Date(0),
                end: end || new Date(8640000000000000)
            });
        }

        const [vouchers, totalCount] = await query
            .orderBy("voucher.created_at", "DESC")
            .skip(skip)
            .take(limitNum)
            .getManyAndCount();

        console.log(vouchers)
        for (let voucher of vouchers) {
            if (voucher.company) {
                voucher.companyId = voucher.company;
                delete voucher.company;
            }
        }

        // Manual population for dynamic references
        for (let voucher of vouchers) {
            // Populate credit
            if (voucher.credit?.id && voucher.credit?.model) {
                try {
                    const creditRepository = AppDataSource.getRepository(voucher.credit.model);
                    const creditDoc = await creditRepository.findOne({
                        where: { id: voucher.credit.id }
                    });
                    voucher.credit.id = creditDoc ? {
                        id: creditDoc.id,
                        accountName: creditDoc.accountName,
                        name: creditDoc.name
                    } : creditDoc;
                } catch (error) {
                    console.log(`Error populating credit for voucher ${voucher.id}:`, error.message);
                    // Keep the original ObjectId if population fails
                }
            }

            // Populate debit
            if (voucher.debit?.id && voucher.debit?.model) {
                try {
                    const debitRepository = AppDataSource.getRepository(voucher.debit.model);
                    const debitDoc = await debitRepository.findOne({
                        where: { id: voucher.debit.id }
                    });
                    voucher.debit.id = debitDoc ? {
                        id: debitDoc.id,
                        accountName: debitDoc.accountName,
                        name: debitDoc.name
                    } : debitDoc;
                } catch (error) {
                    console.log(`Error populating debit for voucher ${voucher.id}:`, error.message);
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
    const voucher = await accountVoucherRepository.findOne({
        where: { id, companyId }
    });

    if (voucher) {
        await accountVoucherRepository.update(
            { id, companyId },
            { isDeleted: true }
        );
    }

    if (!voucher) {
        throw new Error(404, 'Voucher not found or access denied');
    }

    return {
        message: 'Voucher deleted successfully'
    };
}