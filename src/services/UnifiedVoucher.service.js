import AppDataSource from "../core/database/data-source.js";
import { In, MoreThan } from "typeorm";

const unifiedVoucherRepository = AppDataSource.getRepository("UnifiedVoucher");

/**
 * Unified Voucher Service
 * Provides business-friendly methods for all accounting operations
 */
class UnifiedVoucherService {
  /**
   * Create a new voucher
   */
  calculateMaintenanceSurcharge(voucherData) {
    if (voucherData.voucherType !== "MDN" || !voucherData.dueDate) {
      return 0;
    }

    const dueDate = new Date(voucherData.dueDate);
    const currentDate = new Date();
    const daysPastDue = Math.max(
      0,
      Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24))
    );

    if (daysPastDue <= 0) {
      return 0;
    }

    return daysPastDue * 5;
  }

  applyLegacyPreSaveDefaults(voucherData) {
    if (typeof voucherData.amount !== "number" || !Number.isFinite(voucherData.amount)) {
      throw new Error("Amount must be a finite number");
    }

    const amountValue = voucherData.amount;
    const surchargeAmount = this.calculateMaintenanceSurcharge(voucherData);
    const totalAmountOwed = Number(amountValue) + Number(surchargeAmount || 0);
    const explicitOutstanding = voucherData.outstandingAmount;
    if (
      explicitOutstanding !== undefined &&
      explicitOutstanding !== null &&
      (typeof explicitOutstanding !== "number" || !Number.isFinite(explicitOutstanding))
    ) {
      throw new Error("Outstanding amount must be a finite number");
    }
    const initialOutstandingAmount =
      voucherData.outstandingAmount == null ||
      Number(explicitOutstanding) === Number(amountValue)
        ? totalAmountOwed
        : explicitOutstanding;

    voucherData.amount = amountValue;
    voucherData.surchargeAmount = surchargeAmount;
    voucherData.totalAmountOwed = totalAmountOwed;
    voucherData.outstandingAmount = initialOutstandingAmount;
    voucherData.paymentStatus =
      voucherData.paymentStatus ??
      (["AR", "AP"].includes(voucherData.voucherType) ? "pending" : "paid");

    return voucherData;
  }

  async createVoucher(voucherData) {
    try {
      if (!voucherData.voucherNo) {
        voucherData.voucherNo = await this.generateVoucherNumber(
          voucherData.companyId,
          voucherData.voucherType
        );
      }

      this.applyLegacyPreSaveDefaults(voucherData);
      this.validateDoubleEntry(voucherData);

      const voucher = unifiedVoucherRepository.create(voucherData);
      await unifiedVoucherRepository.save(voucher);

      return {
        success: true,
        data: voucher,
        message: "Voucher created successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Failed to create voucher",
      };
    }
  }

  /**
   * Create Accounts Receivable voucher
   */
  async createMaintenanceReceivable(data) {
    const voucherData = {
      voucherType: "AR",
      companyId: data.companyId,
      date: data.date || new Date(),
      month: data.month || new Date().toISOString().slice(0, 7),
      particulars: `Maintenance - ${data.propertyName || "Property"}`,
      debit: {
        accountId: data.customerId,
        accountType: "Customer",
        accountName: data.customerName,
      },
      credit: {
        accountId: data.companyId,
        accountType: "Company",
        accountName: "Company",
      },
      amount: data.amount,
      dueDate: data.dueDate || this.calculateDueDate(30),
      propertyId: data.propertyId,
      propertyName: data.propertyName,
      sourceDocument: {
        referenceId: data.maintenanceId,
        referenceModel: "Maintenance",
      },
      tags: ["Maintenance", "AR"],
      status: "approved",
    };

    return this.createVoucher(voucherData);
  }

  /**
   * Create Accounts Payable voucher
   */
  async createVendorPayable(data) {
    try {
      const voucherData = {
        voucherType: "AP",
        companyId: data.companyId,
        date: data.date || new Date(),
        month: data.month || new Date().toISOString().slice(0, 7),
        particulars: `Vendor Payment - ${data.vendorName}`,
        debit: {
          accountId: data.companyId,
          accountType: "Company",
          accountName: "Company",
        },
        credit: {
          accountId: data.vendorId,
          accountType: "Vendor",
          accountName: data.vendorName,
        },
        amount: data.amount,
        dueDate: data.dueDate || this.calculateDueDate(30),
        sourceDocument: {
          referenceId: data.purchaseId,
          referenceModel: "PurchaseDetails",
        },
        tags: ["Vendor", "AP"],
        status: "approved",
      };

      return await this.createVoucher(voucherData);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Failed to create vendor payable",
      };
    }
  }

  /**
   * Record payment against receivable/payable
   */
  async recordPayment(data) {
    try {
      const { voucherId, paymentAmount, paymentDate, paymentMethod } = data;

      const originalVoucher = await unifiedVoucherRepository.findOne({
        where: { id: voucherId },
      });
      if (!originalVoucher) {
        throw new Error("Original voucher not found");
      }

      if (!["AR", "AP"].includes(originalVoucher.voucherType)) {
        throw new Error("Can only record payments against AR or AP vouchers");
      }

      const paymentAmountValue = Number(paymentAmount);
      if (!Number.isFinite(paymentAmountValue) || paymentAmountValue <= 0) {
        throw new Error("Payment amount must be a positive number");
      }

      const paymentVoucherData = {
        voucherType: originalVoucher.voucherType === "AR" ? "REC" : "PAY",
        companyId: originalVoucher.companyId,
        date: paymentDate || new Date(),
        month: new Date().toISOString().slice(0, 7),
        particulars: `Payment against ${originalVoucher.voucherNo}`,
        debit:
          originalVoucher.voucherType === "AR"
            ? {
                accountId: originalVoucher.companyId,
                accountType: "Company",
                accountName: "Company",
              }
            : {
                accountId: originalVoucher.credit?.accountId,
                accountType: originalVoucher.credit?.accountType,
                accountName: originalVoucher.credit?.accountName,
              },
        credit:
          originalVoucher.voucherType === "AR"
            ? {
                accountId: originalVoucher.debit?.accountId,
                accountType: originalVoucher.debit?.accountType,
                accountName: originalVoucher.debit?.accountName,
              }
            : {
                accountId: originalVoucher.companyId,
                accountType: "Company",
                accountName: "Company",
              },
        amount: paymentAmountValue,
        sourceDocument: {
          referenceId: originalVoucher.id,
          referenceModel: "UnifiedVoucher",
        },
        tags: ["Payment", originalVoucher.voucherType === "AR" ? "REC" : "PAY"],
        status: "approved",
      };

      const paymentResult = await this.createVoucher(paymentVoucherData);
      if (!paymentResult.success) {
        throw new Error(paymentResult.error);
      }

      const paymentVoucher = paymentResult.data;
      const paymentDateValue = paymentDate || new Date();
      const paymentHistory = Array.isArray(originalVoucher.paymentHistory)
        ? originalVoucher.paymentHistory
        : [];
      const totalAmountOwed = Number(
        originalVoucher.totalAmountOwed ?? originalVoucher.amount ?? 0
      );
      const totalPaid = paymentHistory.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        paymentAmountValue
      );
      const newOutstandingAmount = Math.max(0, totalAmountOwed - totalPaid);
      const linkedVouchers = Array.isArray(originalVoucher.linkedVouchers)
        ? originalVoucher.linkedVouchers
        : [];

      const updateData = {
        outstandingAmount: newOutstandingAmount,
        paymentStatus: newOutstandingAmount === 0 ? "paid" : "partial",
        lastPaymentAmount: paymentAmountValue,
        lastPaymentDate: paymentDateValue,
        paymentHistory: [
          ...paymentHistory,
          {
            amount: paymentAmountValue,
            date: paymentDateValue,
            voucherId: paymentVoucher.id,
            particulars: `Payment of ${paymentAmountValue}`,
          },
        ],
        linkedVouchers: [
          ...linkedVouchers,
          {
            voucherId: paymentVoucher.id,
            amount: paymentAmountValue,
            date: paymentDateValue,
          },
        ],
      };

      Object.assign(originalVoucher, updateData);
      await unifiedVoucherRepository.save(originalVoucher);

      return {
        success: true,
        data: {
          originalVoucher: await unifiedVoucherRepository.findOne({
            where: { id: voucherId },
          }),
          paymentVoucher,
        },
        message: "Payment recorded successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Failed to record payment",
      };
    }
  }

  /**
   * Get Accounts Receivable with filters
   */
  async getAccountsReceivable(companyId, filters = {}) {
    try {
      const vouchers = await unifiedVoucherRepository.find({
        where: {
          ...filters,
          companyId,
          voucherType: "AR",
          paymentStatus: In(["pending", "partial", "overdue"]),
          isDeleted: false,
          outstandingAmount: MoreThan(0),
        },
        order: { dueDate: "ASC" },
      });

      const totalOutstanding = vouchers.reduce(
        (sum, v) => sum + Number(v.outstandingAmount || 0),
        0
      );

      return {
        success: true,
        data: {
          vouchers,
          totalOutstanding,
          count: vouchers.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Failed to get accounts receivable",
      };
    }
  }

  /**
   * Get Accounts Payable with filters
   */
  async getAccountsPayable(companyId, filters = {}) {
    try {
      const vouchers = await unifiedVoucherRepository.find({
        where: {
          ...filters,
          companyId,
          voucherType: "AP",
          paymentStatus: In(["pending", "partial", "overdue"]),
          isDeleted: false,
          outstandingAmount: MoreThan(0),
        },
        order: { dueDate: "ASC" },
      });

      const totalOutstanding = vouchers.reduce(
        (sum, v) => sum + Number(v.outstandingAmount || 0),
        0
      );

      return {
        success: true,
        data: {
          vouchers,
          totalOutstanding,
          count: vouchers.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Failed to get accounts payable",
      };
    }
  }

  /**
   * Get Maintenance Service vouchers
   */
  async getMaintenanceServices(companyId, filters = {}) {
    try {
      const queryBuilder = unifiedVoucherRepository
        .createQueryBuilder("voucher")
        .where("voucher.companyId = :companyId", { companyId })
        .andWhere("voucher.voucherType = :voucherType", { voucherType: "MDN" })
        .andWhere("voucher.isDeleted = :isDeleted", { isDeleted: false })
        .andWhere(":maintenanceTag = ANY(voucher.tags)", {
          maintenanceTag: "Maintenance",
        })
        .orderBy("voucher.date", "DESC");

      if (filters.month !== undefined && filters.month !== null) {
        queryBuilder.andWhere("voucher.month = :month", { month: filters.month });
      }
      if (filters.propertyId !== undefined && filters.propertyId !== null) {
        queryBuilder.andWhere("voucher.propertyId = :propertyId", {
          propertyId: filters.propertyId,
        });
      }
      if (filters.date?.$gte !== undefined) {
        queryBuilder.andWhere("voucher.date >= :dateFrom", {
          dateFrom: filters.date.$gte,
        });
      }
      if (filters.date?.$lte !== undefined) {
        queryBuilder.andWhere("voucher.date <= :dateTo", {
          dateTo: filters.date.$lte,
        });
      }

      const vouchers = await queryBuilder.getMany();

      const totalRevenue = vouchers.reduce((sum, v) => sum + Number(v.amount || 0), 0);

      return {
        success: true,
        data: {
          vouchers,
          totalRevenue,
          count: vouchers.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Failed to get maintenance services",
      };
    }
  }

  /**
   * Generate ledger for a specific account
   */
  async generateLedger(accountId, accountType, companyId, filters = {}) {
    try {
      const queryBuilder = unifiedVoucherRepository
        .createQueryBuilder("voucher")
        .where("voucher.companyId = :companyId", { companyId })
        .andWhere("voucher.isDeleted = :isDeleted", { isDeleted: false })
        .andWhere(
          "((voucher.debit ->> 'accountId' = :accountId AND voucher.debit ->> 'accountType' = :accountType) OR (voucher.credit ->> 'accountId' = :accountId AND voucher.credit ->> 'accountType' = :accountType))",
          { accountId: String(accountId), accountType }
        )
        .orderBy("voucher.date", "ASC");

      Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
          queryBuilder.andWhere(`voucher.${key} IN (:...${key})`, { [key]: value });
          return;
        }
        queryBuilder.andWhere(`voucher.${key} = :${key}`, { [key]: value });
      });

      const ledger = await queryBuilder.getMany();

      let balance = 0;
      const ledgerWithBalance = ledger.map((entry) => {
        const isDebit =
          String(entry.debit?.accountId ?? "") === String(accountId) &&
          String(entry.debit?.accountType ?? "") === String(accountType);
        const amount = Number(entry.amount || 0);

        if (isDebit) {
          balance += amount;
        } else {
          balance -= amount;
        }

        return {
          ...entry,
          isDebit,
          entryType: isDebit ? "Debit" : "Credit",
          runningBalance: balance,
        };
      });

      return {
        success: true,
        data: {
          ledger: ledgerWithBalance,
          finalBalance: balance,
          accountId,
          accountType,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Failed to generate ledger",
      };
    }
  }

  /**
   * Generate aging report
   */
  async generateAgingReport(companyId, voucherType = "AR") {
    try {
      const rows = await AppDataSource.manager.query(
        `
          SELECT
            CASE
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 0 THEN 'Not Due'
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 30 THEN '0-30 days'
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 60 THEN '31-60 days'
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 90 THEN '61-90 days'
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 120 THEN '91-120 days'
              ELSE 'Over 120 days'
            END AS "ageRange",
            COUNT(*)::int AS count,
            COALESCE(SUM(CAST(outstanding_amount AS numeric)), 0) AS "totalAmount"
          FROM unified_vouchers
          WHERE company_id = $1
            AND voucher_type = $2
            AND payment_status IN ('pending', 'partial', 'overdue')
            AND is_deleted = false
          GROUP BY
            CASE
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 0 THEN 'Not Due'
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 30 THEN '0-30 days'
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 60 THEN '31-60 days'
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 90 THEN '61-90 days'
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 120 THEN '91-120 days'
              ELSE 'Over 120 days'
            END
          ORDER BY
            CASE
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 0 THEN 1
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 30 THEN 2
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 60 THEN 3
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 90 THEN 4
              WHEN FLOOR(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400) < 120 THEN 5
              ELSE 6
            END;
        `,
        [companyId, voucherType]
      );

      const agingReport = rows.map((row) => ({
        _id: { ageRange: row.ageRange },
        count: Number(row.count),
        totalAmount: Number(row.totalAmount || 0),
      }));

      return {
        success: true,
        data: agingReport,
        voucherType,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Failed to generate aging report",
      };
    }
  }

  /**
   * Generate monthly summary
   */
  async generateMonthlySummary(companyId, month) {
    try {
      const rows = await AppDataSource.manager.query(
        `
          SELECT
            voucher_type AS "_id",
            COUNT(*)::int AS count,
            COALESCE(SUM(CAST(amount AS numeric)), 0) AS "totalAmount"
          FROM unified_vouchers
          WHERE company_id = $1
            AND month = $2
            AND is_deleted = false
          GROUP BY voucher_type;
        `,
        [companyId, month]
      );

      const summary = rows.map((row) => ({
        _id: row._id,
        count: Number(row.count),
        totalAmount: Number(row.totalAmount || 0),
      }));

      return {
        success: true,
        data: summary,
        month,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Failed to generate monthly summary",
      };
    }
  }

  /**
   * Get outstanding balance for an account
   */
  async getOutstandingBalance(accountId, accountType, companyId) {
    try {
      const [row] = await AppDataSource.manager.query(
        `
          SELECT
            COALESCE(
              SUM(
                CASE
                  WHEN debit ->> 'accountId' = $1 AND debit ->> 'accountType' = $2 THEN CAST(amount AS numeric)
                  ELSE 0
                END
              ),
              0
            ) AS "totalDebit",
            COALESCE(
              SUM(
                CASE
                  WHEN credit ->> 'accountId' = $1 AND credit ->> 'accountType' = $2 THEN CAST(amount AS numeric)
                  ELSE 0
                END
              ),
              0
            ) AS "totalCredit"
          FROM unified_vouchers
          WHERE company_id = $3
            AND is_deleted = false
            AND (
              (debit ->> 'accountId' = $1 AND debit ->> 'accountType' = $2)
              OR
              (credit ->> 'accountId' = $1 AND credit ->> 'accountType' = $2)
            );
        `,
        [String(accountId), accountType, companyId]
      );

      const balance = Number(row.totalDebit || 0) - Number(row.totalCredit || 0);

      return {
        success: true,
        data: {
          accountId,
          accountType,
          balance,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Failed to get outstanding balance",
      };
    }
  }

  /**
   * Generate trial balance
   */
  async generateTrialBalance(companyId, month) {
    try {
      const rows = await AppDataSource.manager.query(
        `
          WITH account_totals AS (
            SELECT
              (debit ->> 'accountId') AS "accountId",
              (debit ->> 'accountType') AS "accountType",
              (debit ->> 'accountName') AS "accountName",
              SUM(CAST(amount AS numeric)) AS "totalDebit",
              0::numeric AS "totalCredit"
            FROM unified_vouchers
            WHERE company_id = $1
              AND month = $2
              AND is_deleted = false
            GROUP BY
              (debit ->> 'accountId'),
              (debit ->> 'accountType'),
              (debit ->> 'accountName')

            UNION ALL

            SELECT
              (credit ->> 'accountId') AS "accountId",
              (credit ->> 'accountType') AS "accountType",
              (credit ->> 'accountName') AS "accountName",
              0::numeric AS "totalDebit",
              SUM(CAST(amount AS numeric)) AS "totalCredit"
            FROM unified_vouchers
            WHERE company_id = $1
              AND month = $2
              AND is_deleted = false
            GROUP BY
              (credit ->> 'accountId'),
              (credit ->> 'accountType'),
              (credit ->> 'accountName')
          )
          SELECT
            "accountId",
            "accountType",
            "accountName",
            COALESCE(SUM("totalDebit"), 0)::numeric AS "totalDebit",
            COALESCE(SUM("totalCredit"), 0)::numeric AS "totalCredit"
          FROM account_totals
          GROUP BY "accountId", "accountType", "accountName"
          ORDER BY "accountType" ASC, "accountName" ASC;
        `,
        [companyId, month]
      );

      const trialBalance = rows.map((account) => ({
        _id: {
          accountId: account.accountId,
          accountType: account.accountType,
          accountName: account.accountName,
        },
        totalDebit: Number(account.totalDebit || 0),
        totalCredit: Number(account.totalCredit || 0),
        balance:
          Number(account.totalDebit || 0) - Number(account.totalCredit || 0),
      }));

      const totalDebits = trialBalance.reduce((sum, account) => sum + account.totalDebit, 0);
      const totalCredits = trialBalance.reduce((sum, account) => sum + account.totalCredit, 0);

      return {
        success: true,
        data: {
          trialBalance,
          totalDebits,
          totalCredits,
          month,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "Failed to generate trial balance",
      };
    }
  }

  /**
   * Generate voucher number
   */
  async generateVoucherNumber(companyId, voucherType) {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");

      const count = await unifiedVoucherRepository.count({
        where: {
          companyId,
          voucherType,
          month: `${year}-${month}`,
          isDeleted: false,
        },
      });

      return `${voucherType}-${year}${month}-${String(count + 1).padStart(4, "0")}`;
    } catch (error) {
      throw new Error("Failed to generate voucher number");
    }
  }

  /**
   * Validate double-entry accounting
   */
  validateDoubleEntry(voucherData) {
    if (!voucherData.debit || !voucherData.credit) {
      throw new Error("Both debit and credit entries are required");
    }

    if (!voucherData.debit.accountId || !voucherData.credit.accountId) {
      throw new Error("Account IDs are required for both debit and credit");
    }

    if (voucherData.debit.accountId.toString() === voucherData.credit.accountId.toString()) {
      throw new Error("Debit and credit cannot be the same account");
    }
  }

  /**
   * Calculate due date
   */
  calculateDueDate(daysFromNow) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
    return dueDate;
  }
}

export default UnifiedVoucherService;
