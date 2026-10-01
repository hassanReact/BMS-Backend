import AppDataSource from "../core/database/data-source.js";
import { Between, In } from "typeorm";
import {
  errorCodes,
  invoicePrefix,
  Message,
  statusCodes,
} from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import { sendEmail } from "../core/helpers/mail.js"
import ExcelJS from 'exceljs';

const billRepository = AppDataSource.getRepository("Bill");
const propertyRepository = AppDataSource.getRepository("Property");
const tenantRepository = AppDataSource.getRepository("Tenant");
const agentRepository = AppDataSource.getRepository("Agent");
const companyRepository = AppDataSource.getRepository("Company");
const accountsReceivableRepository = AppDataSource.getRepository("AccountsReceivable");
const accountVoucherRepository = AppDataSource.getRepository("AccountVoucher");
const unifiedVoucherRepository = AppDataSource.getRepository("UnifiedVoucher");

export const createbill = async (req, res) => {
  const {
    tenantId,
    propertyId,
    bookingId,
    billingMonth,
    description,
    totalBillAmount,
    companyId,
    createdBy,
    voucherNo
    // rentAmount,
    // extraCharges = [],
    // electricityUnit,
    // extraAmount,
    // electricityRate,
    // gstpercent,
    // electricityBillAmount,
    // note,
    // totalBillAmountAfterGST,
    // totalgst,
  } = req.body;

  // console.log("Request Body:", req.body);

  const billingDate = new Date(billingMonth + 'T00:00:00');
  const monthNumber = parseInt(billingMonth.split('-')[1]);
  const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const formattedBillingMonth = monthNames[monthNumber - 1];

  const generateInvoiceNumber = async () => {
    const prefix = invoicePrefix.prefix;
    const year = new Date().getFullYear().toString().slice(-2);
    let invoiceNo;
    let isUnique = false;

    // Keep generating until we get a unique voucher number
    while (!isUnique) {
      const randomNumbers = Math.floor(100 + Math.random() * 900);
      invoiceNo = `${prefix}${year}${formattedBillingMonth}${randomNumbers}`;

      // Check if this voucher number already exists
      const existingVoucher = await unifiedVoucherRepository.findOne({
        where: { voucherNo: invoiceNo }
      });
      if (!existingVoucher) {
        isUnique = true;
      }
    }

    return invoiceNo;
  };

  // Use provided voucherNo or generate new one
  let invoiceNo;
  if (voucherNo) {
    // Check if provided voucherNo already exists
    const existingVoucher = await unifiedVoucherRepository.findOne({
      where: { voucherNo }
    });
    if (existingVoucher) {
      throw new CustomError(
        statusCodes?.badRequest,
        `Voucher number ${voucherNo} already exists. Please use a different voucher number.`,
        errorCodes?.already_exist
      );
    }
    invoiceNo = voucherNo;
  } else {
    invoiceNo = await generateInvoiceNumber();
  }

  const newBill = billRepository.create({
    tenantId,
    propertyId,
    billingMonth,
    bookingId,
    invoiceNo: invoiceNo,
    totalBillAmount,
    companyId,
    createdBy
    // rentAmount,
    // extraAmount,
    // extraCharges,
    // gstpercent,
    // electricityUnit,
    // electricityRate,
    // electricityBillAmount,
    // note,
    // totalBillAmountAfterGST,
    // totalgst,
  });
  await billRepository.save(newBill);

  const property = await propertyRepository.findOne({
    where: { id: propertyId }
  });
  if (!property) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const tenant = await tenantRepository.findOne({
    where: { id: tenantId }
  });
  if (!tenant) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const unifiedVoucher = unifiedVoucherRepository.create({
    voucherNo: invoiceNo,
    voucherType: 'AR',
    sourceDocument: {
      referenceId: newBill.id,
      referenceModel: 'Bill'
    },
    companyId,
    propertyId,
    propertyName: property?.propertyname || "",
    particulars: description || `Bill for ${property?.propertyname || 'Property'} - ${formattedBillingMonth}`,
    amount: totalBillAmount,
    outstandingAmount: totalBillAmount,
    totalAmountOwed: totalBillAmount,
    date: billingDate,
    month: billingMonth,
    status: 'pending',
    paymentStatus: 'pending',
    dueDate: new Date(billingDate.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days from billing date
    debit: {
      accountId: tenantId,
      accountType: 'Tenant',
      accountName: tenant?.tenantName || ""
    },
    credit: {
      accountId: companyId,
      accountType: "Company"
    },
    isDeleted: false
  });
  await unifiedVoucherRepository.save(unifiedVoucher);

  const CompanyDetails = await companyRepository.findOne({
    where: { id: companyId }
  });

  if (process.env.FEATURE_EMAIL == 'on' && CompanyDetails.isMailStatus) {
    sendTenantBillEmail(newBill, property, CompanyDetails, tenant);
  }
  if (process.env.FEATURE_WHATSAAP == 'on' && CompanyDetails.whatappStatus) {
    await sendWhatsAppMessage(newBill, property, CompanyDetails, tenant);
  }

  return newBill;
};

export const bulkUploadWaterBills = async (req) => {
  const file = req?.file?.path;
  if (!file) {
    throw new CustomError(
      statusCodes?.badRequest,
      Message?.fileNotProvided,
      errorCodes?.file_missing
    );
  }

  const { companyId, createdBy, billingMonth } = req.body;

  if (!companyId || !createdBy || !billingMonth) {
    throw new CustomError(
      statusCodes?.badRequest,
      'Company ID, Created By, and Billing Month are required',
      errorCodes?.invalid_format
    );
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const worksheet = workbook.worksheets[0];

  const waterBills = [];
  const keysToCheck = ["tenantName", "propertyName", "waterUnits", "waterRate", "totalAmount"];
  const createdBills = [];
  const createdVouchers = [];

  // Generate invoice number prefix
  const generateInvoiceNumber = async () => {
    const prefix = invoicePrefix.prefix;
    const year = new Date().getFullYear().toString().slice(-2);
    const monthNumber = parseInt(billingMonth.split('-')[1]);
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const formattedBillingMonth = monthNames[monthNumber - 1];
    let invoiceNo;
    let isUnique = false;

    // Keep generating until we get a unique voucher number
    while (!isUnique) {
      const randomNumbers = Math.floor(100 + Math.random() * 900);
      invoiceNo = `${prefix}${year}${formattedBillingMonth}${randomNumbers}`;

      // Check if this voucher number already exists
      const existingVoucher = await unifiedVoucherRepository.findOne({
        where: { voucherNo: invoiceNo }
      });
      if (!existingVoucher) {
        isUnique = true;
      }
    }

    return invoiceNo;
  };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    const waterBill = {
      tenantName: row.getCell(1)?.text?.trim() || '',
      propertyName: row.getCell(2)?.text?.trim() || '',
      waterUnits: parseFloat(row.getCell(3)?.text?.trim()) || 0,
      waterRate: parseFloat(row.getCell(4)?.text?.trim()) || 0,
      totalAmount: parseFloat(row.getCell(5)?.text?.trim()) || 0,
      description: row.getCell(6)?.text?.trim() || 'Water Bill',
      companyId,
      createdBy,
      billingMonth
    };

    // Validate required fields
    if (!keysToCheck.every((key) => waterBill[key] !== undefined && waterBill[key] !== '')) {
      throw new CustomError(
        statusCodes.badRequest,
        `Row ${rowNumber} is missing required fields`,
        errorCodes.invalid_format
      );
    }

    waterBills.push(waterBill);
  });

  for (const waterBill of waterBills) {
    try {
      // Find tenant by name
      const tenant = await tenantRepository.findOne({
        where: {
          tenantName: waterBill.tenantName,
          companyId,
          isDeleted: false
        }
      });

      if (!tenant) {
        console.log(`Tenant not found: ${waterBill.tenantName}`);
        continue;
      }

      // Find property by name
      const property = await propertyRepository.findOne({
        where: {
          propertyname: waterBill.propertyName,
          companyId,
          isDeleted: false
        }
      });

      if (!property) {
        console.log(`Property not found: ${waterBill.propertyName}`);
        continue;
      }

      // Check if bill already exists for this tenant, property, and month
      const existingBill = await billRepository.findOne({
        where: {
          tenantId: tenant.id,
          propertyId: property.id,
          billingMonth: waterBill.billingMonth,
          companyId,
          isDeleted: false
        }
      });

      if (existingBill) {
        console.log(`Bill already exists for ${waterBill.tenantName} - ${waterBill.propertyName} for ${waterBill.billingMonth}`);
        continue;
      }

      // Generate invoice number
      const invoiceNo = await generateInvoiceNumber();

      // Create the bill
      const newBill = billRepository.create({
        tenantId: tenant.id,
        propertyId: property.id,
        billingMonth: waterBill.billingMonth,
        invoiceNo: invoiceNo,
        totalBillAmount: waterBill.totalAmount,
        companyId,
        createdBy,
        status: false // Unpaid by default
      });
      await billRepository.save(newBill);

      if (!newBill) {
        throw new CustomError(
          statusCodes.badRequest,
          `Failed to create water bill for ${waterBill.tenantName}`,
          errorCodes.not_created
        );
      }

      // Create billing date
      const billingDate = new Date(waterBill.billingMonth + 'T00:00:00');

      // Create unified voucher for the water bill using the same pattern as createbill
      const voucher = unifiedVoucherRepository.create({
        voucherNo: invoiceNo,
        voucherType: 'AR',
        sourceDocument: {
          referenceId: newBill.id,
          referenceModel: 'Bill'
        },
        companyId,
        propertyId: property.id,
        propertyName: property?.propertyname || "",
        particulars: waterBill.description ? `${waterBill.description} - ${waterBill.waterUnits} units @ ${waterBill.waterRate}/unit` : `Water Bill - ${waterBill.waterUnits} units @ ${waterBill.waterRate}/unit`,
        amount: waterBill.totalAmount,
        outstandingAmount: waterBill.totalAmount,
        totalAmountOwed: waterBill.totalAmount,
        date: billingDate,
        month: waterBill.billingMonth,
        status: 'pending',
        paymentStatus: 'pending',
        dueDate: new Date(billingDate.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days from billing date
        debit: {
          accountId: tenant.id,
          accountType: 'Customer',
          accountName: tenant?.tenantName || ""
        },
        credit: {
          accountId: companyId,
          accountType: "Company"
        },
        isDeleted: false
      });
      await unifiedVoucherRepository.save(voucher);

      if (!voucher) {
        // If voucher creation fails, delete the bill
        await billRepository.delete(newBill.id);
        throw new CustomError(
          statusCodes.badRequest,
          `Failed to create voucher for water bill ${waterBill.tenantName}`,
          errorCodes.not_created
        );
      }

      createdBills.push(newBill);
      createdVouchers.push(voucher);

      console.log(`Successfully created water bill and voucher for ${waterBill.tenantName} - ${waterBill.propertyName}`);

    } catch (error) {
      console.error(`Error processing water bill for ${waterBill.tenantName}:`, error.message);
      // Continue with next bill instead of failing completely
      continue;
    }
  }

  if (createdBills.length === 0) {
    throw new CustomError(
      statusCodes.badRequest,
      'No new water bills were created',
      errorCodes.not_created
    );
  }

  return {
    message: `Successfully created ${createdBills.length} water bills and vouchers`,
    createdBills: createdBills.length,
    createdVouchers: createdVouchers.length,
    bills: createdBills,
    vouchers: createdVouchers
  };
};

const sendWhatsAppMessage = async (newBill, property, CompanyDetails, tenant) => {
  try {

    const tenantBillWhatsAppText = `
🧾 *Your Monthly Bill - ${CompanyDetails.companyName}*

Hi ${tenant.tenantName},

Here are your billing details for ${property.propertyname}:

• 🧮 *Invoice No:* ${newBill.invoiceNo}
• 📅 *Month:* ${new Date(newBill.billingMonth).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
• 💰 *Rent:* $${newBill.rentAmount}
${newBill.extraCharges && newBill.extraCharges.length > 0
        ? newBill.extraCharges.map(charge => `• ➕ ${charge.serviceName}: $${charge.price}`).join('\n')
        : '• ➕ Extra Charges: None'}
• 🧾 *GST (${newBill.gstpercent}%):* $${newBill.totalgst}
• 💵 *Total After GST:* $${newBill.totalBillAmountAfterGST}
• 📝 *Note:* ${newBill.note || "No additional notes"}
• 📌 *Payment Status:* ${newBill.status ? "✅ Paid" : "❌ Pending"}

Please make the payment by the due date. Reach us at ${CompanyDetails.email} if you have any questions.

— ${CompanyDetails.companyName} Team
`;


    return sendWhatsApp(
      tenant?.phoneno,
      tenantBillWhatsAppText
    );
  } catch (err) {
    console.error("Failed to send tenant registration email:", err);
  }
};


const sendTenantBillEmail = async (newBill, property, CompanyDetails, tenant) => {
  try {
    // Generate extra charges list dynamically if there are extra charges
    const extraChargesList = newBill.extraCharges && newBill.extraCharges.length > 0
      ? newBill.extraCharges.map(charge => {
        return `<li><strong>${charge.serviceName}:</strong> $${charge.price}</li>`;
      }).join('') // Join the array elements into a string
      : `<li><strong>Extra Charges:</strong> None</li>`; // If no extra charges, show "None"

    // Email to Tenant with Billing Details
    const billDetails = `
    <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333;">
      
      <!-- Header Section -->
      <div style="background-color: #4CAF50; color: white; padding: 15px; text-align: center;">
        <h2 style="margin: 0;">Your Bill from ${CompanyDetails.companyName}</h2>
      </div>

      <!-- Body Section -->
      <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #ddd; padding: 20px; box-sizing: border-box;">
        <p style="font-size: 16px; line-height: 1.6;">Dear ${tenant?.tenantName},</p>
        <p style="font-size: 16px; line-height: 1.6;">Thank you for being a valued tenant at <strong>${CompanyDetails.companyName}</strong>. Below are the details of your latest bill for the property you are renting:</p>
        
        <ul style="font-size: 16px; line-height: 1.6;">
          <li><strong>Invoice No:</strong> ${newBill.invoiceNo}</li>
          <li><strong>Billing Month:</strong> ${new Date(newBill.billingMonth).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</li>
          <li><strong>Property:</strong> ${property.propertyname}</li>
          <li><strong>Rent Amount:</strong> $${newBill.rentAmount}</li>
          ${extraChargesList} <!-- Dynamically add extra charges -->
          <li><strong>GST (${newBill.gstpercent}%):</strong> $${newBill.totalgst}</li>
          <li><strong>Total Bill Amount After GST:</strong> $${newBill.totalBillAmountAfterGST}</li>
          <li><strong>Note:</strong> ${newBill.note || "No additional notes"}</li>
<li><strong>Payment Status:</strong> ${newBill.status ? "Paid" : "Pending"}</li>

        </ul>

        <p style="font-size: 16px; line-height: 1.6;">Please ensure to make the payment before the due date. If you have any questions or concerns regarding your bill, feel free to contact us.</p>
      </div>

      <!-- Footer Section -->
      <div style="background-color: #f4f4f4; color: #777; text-align: center; padding: 15px;">
        <p style="margin: 0;">Best regards,</p>
        <p style="margin: 0;"><strong>The ${CompanyDetails.companyName} Team</strong></p>
        <p>${CompanyDetails.email}</p>
      </div>
    </div>
    `;

    // Send the email to the tenant
    return sendEmail(
      tenant?.email,
      "Your Bill from " + CompanyDetails.companyName,
      billDetails,
      CompanyDetails.id
    );
  } catch (err) {
    console.error("Failed to send tenant bill email:", err);
  }
};



export const getAllBill = async (req) => {
  const companyId = req.query.id;
  const AllBill = await unifiedVoucherRepository
    .createQueryBuilder("voucher")
    .where("voucher.company_id = :companyId", { companyId })
    .andWhere("voucher.is_deleted = false")
    .andWhere("voucher.voucher_type = :voucherType", { voucherType: "GB" })
    .andWhere("voucher.outstanding_amount > 0")
    .getMany();

  const sourceIdsByModel = new Map();
  for (const voucher of AllBill) {
    const sourceDocument = voucher.sourceDocument;
    if (!sourceDocument?.referenceId || !sourceDocument.referenceModel) {
      continue;
    }

    const modelIds = sourceIdsByModel.get(sourceDocument.referenceModel) || [];
    modelIds.push(sourceDocument.referenceId);
    sourceIdsByModel.set(sourceDocument.referenceModel, modelIds);
  }

  const sourceDocumentsByModel = new Map();
  for (const [model, ids] of sourceIdsByModel) {
    const sourceDocuments = await AppDataSource.getRepository(model).find({
      where: { id: In(ids) }
    });
    sourceDocumentsByModel.set(
      model,
      new Map(sourceDocuments.map((sourceDocument) => [sourceDocument.id, sourceDocument]))
    );
  }

  for (const voucher of AllBill) {
    const sourceDocument = voucher.sourceDocument;
    const sourceDocuments = sourceDocumentsByModel.get(sourceDocument?.referenceModel);
    const source = sourceDocuments?.get(sourceDocument?.referenceId);
    if (source) {
      voucher.sourceDocument = { ...sourceDocument, referenceId: source };
    }
  }

  if (!AllBill) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }



  return AllBill;
};


export const getBillByT = async (req) => {
  const tenantId = req.query.id;
  const tenantBill = await billRepository.find({
    where: { tenantId, isDeleted: false },
    relations: { tenant: true, property: true },
    order: { createdAt: "DESC" }
  });

  if (!tenantBill) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }
  return tenantBill;
};

export const getBillForTPending = async (req) => {
  const tenantId = req.query.id;
  const tenantBill = await billRepository.find({
    where: { tenantId, isDeleted: false, status: false },
    relations: { tenant: true, property: true },
    order: { createdAt: "DESC" }
  });

  if (!tenantBill) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }
  return tenantBill;
};

export const getBillByBookingId = async (req) => {
  const bookingId = req.query.id;
  const bill = await billRepository.find({
    where: { bookingId },
    relations: { tenant: true, property: true, company: true }
  });

  if (!bill) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }
  return bill;
};

export const getBillById = async (req) => {
  const billId = req.query.id;
  const bill = await billRepository.findOne({
    where: { id: billId },
    relations: { tenant: true, property: true, company: true }
  });

  if (!bill) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }
  return bill;
};

export const getBillByCreaterBy = async (req) => {
  const AgentId = req.query.id;
  const bill = await billRepository.find({
    where: { createdBy: AgentId },
    relations: { tenant: true, property: true, company: true }
  });

  if (!bill) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }
  return bill;
};

export const getAllUnpaidBillForAgent = async (req) => {
  const AgentId = req.query.id;
  const bill = await billRepository.find({
    where: { createdBy: AgentId, status: false }
  });

  if (!bill) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }
  return bill;
};

export const reporterDetails = async (req) => {
  const repoterId = req.query.id;
  const bill = await billRepository.findOne({
    where: { id: repoterId },
    relations: { tenant: true, property: true, company: true }
  });

  if (!bill) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }
  return bill;
};

export const getMonthlyPaidBillsForAgent = async (req) => {
  const agentId = req.query.agentId;
  const year = new Date().getFullYear();

  if (!agentId) {
    throw new Error('Invalid or missing agentId');
  }

  const result = await billRepository
    .createQueryBuilder("bill")
    .select("EXTRACT(MONTH FROM bill.updated_at)", "month")
    .addSelect("SUM(bill.total_bill_amount_after_gst)", "totalPaid")
    .where("bill.status = :status", { status: true })
    .andWhere("bill.is_deleted <> :deleted", { deleted: true })
    .andWhere("bill.created_by = :agentId", { agentId })
    .andWhere("bill.updated_at >= :startDate", { startDate: new Date(`${year}-01-01`) })
    .andWhere("bill.updated_at < :endDate", { endDate: new Date(`${year + 1}-01-01`) })
    .groupBy("EXTRACT(MONTH FROM bill.updated_at)")
    .getRawMany();

  const monthlyTotals = Array(12).fill(0);

  result.forEach(item => {
    const monthIndex = Number(item.month) - 1;
    monthlyTotals[monthIndex] = Number(item.totalPaid);
  });

  return monthlyTotals;
};

export const getBillSummaryBetweenDates = async (req, res) => {
  const { startDate, endDate, companyId } = req.query;

  if (!startDate || !endDate || !companyId) {
    throw new CustomError(
      statusCodes.notFound,
      Message.notFound,
      errorCodes.no_data_found
    );
  }

  const isValidCompanyId = typeof companyId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(companyId);

  if (!isValidCompanyId) {
    throw new CustomError(
      statusCodes.badRequest,
      Message.invalidId,
      errorCodes.validation_error
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const aggregation = await billRepository
    .createQueryBuilder("bill")
    .select("bill.status", "status")
    .addSelect("SUM(bill.total_bill_amount_after_gst)", "totalAmount")
    .addSelect("COUNT(*)", "count")
    .where("bill.is_deleted = :deleted", { deleted: false })
    .andWhere("bill.company_id = :companyId", { companyId })
    .andWhere("bill.created_at BETWEEN :start AND :end", { start, end })
    .groupBy("bill.status")
    .getRawMany();

  const bills = await billRepository.find({
    where: {
      isDeleted: false,
      companyId,
      createdAt: Between(start, end)
    },
    relations: { tenant: true, property: true, booking: true, company: true }
  });

  const properties = await propertyRepository.find({
    where: {
      isDeleted: false,
      companyId,
      createdAt: Between(start, end)
    }
  });

  const agents = await agentRepository.find({
    where: {
      isDeleted: "false",
      companyId,
      createdAt: Between(start, end)
    }
  });

  const tenants = await tenantRepository.find({
    where: {
      isDeleted: false,
      companyId,
      createdAt: Between(start, end)
    }
  });

  const summary = {
    totalBills: bills.length,
    paid: { count: 0, totalAmount: 0 },
    unpaid: { count: 0, totalAmount: 0 },
    bills,
    properties,
    tenants,
    agents
  };



  aggregation.forEach(item => {
    if (item.status === true) {
      summary.paid = { count: Number(item.count), totalAmount: Number(item.totalAmount) };
    } else {
      summary.unpaid = { count: Number(item.count), totalAmount: Number(item.totalAmount) };
    }
  });
  return summary
};

export const changeBillStatus = async (req) => {
  const billId = req.query.id;
  const { paymentType } = req.body;

  const bill = await billRepository.findOne({
    where: { id: billId }
  });

  if (!bill) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }

  bill.status = true;
  bill.paymentType = paymentType;
  const CompanyId = bill.companyId;
  const PropertyId = bill.propertyId;
  const TenantId = bill.tenantId;

  const CompanyDetails = await companyRepository.findOne({
    where: { id: CompanyId }
  });
  const property = await propertyRepository.findOne({
    where: { id: PropertyId }
  });
  const tenant = await tenantRepository.findOne({
    where: { id: TenantId }
  });

  if (CompanyDetails.isMailStatus) {
    sendTenantBillEmail(bill, property, CompanyDetails, tenant);
  };

  await billRepository.save(bill);
  return bill;
};

export const deleteBill = async (req, res) => {
  const billId = req.query.id;

  const bill = await billRepository.findOne({
    where: { id: billId }
  });
  if (!bill) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  // Only allow deletion of pending bills
  if (bill.status && bill.status.toLowerCase() !== 'pending') {
    throw new CustomError(
      statusCodes?.badRequest,
      `Cannot delete bill with status: ${bill.status}. Only pending bills can be deleted.`,
      errorCodes?.bad_request
    );
  }

  // Delete bill
  bill.isDeleted = true;
  await billRepository.save(bill);

  // Delete related records
  await accountsReceivableRepository
    .createQueryBuilder()
    .update()
    .set({ isDeleted: true })
    .where("reference_id = :billId", { billId })
    .andWhere("reference_model = :referenceModel", { referenceModel: "Bill" })
    .andWhere("LOWER(status) = :status", { status: "pending" })
    .execute();

  await accountVoucherRepository
    .createQueryBuilder()
    .update()
    .set({ isDeleted: true })
    .where("reference_id = :billId", { billId })
    .andWhere("models = :models", { models: "Bill" })
    .andWhere("LOWER(status) = :status", { status: "pending" })
    .execute();

  return bill;
};

export const updateBillVoucher = async (req, res) => {
  const billId = req.params.id;
  const {
    tenantId,
    propertyId,
    voucherNo,
    bookingId,
    billingMonth,
    totalBillAmount,
    description,
    createdBy,
    companyId
  } = req.body;

  console.log('Looking for bill with ID:', billId);
  console.log('Request body bookingId:', bookingId);

  // Update corresponding UnifiedVoucher if it exists
  try {
    const existingVoucher = await unifiedVoucherRepository.findOne({
      where: {
        id: billId,
        companyId,
        isDeleted: false
      }
    });

    console.log('Existing voucher:', existingVoucher ? existingVoucher : false);

    if (existingVoucher) {
      // Safely calculate balance to avoid NaN
      const currentPaid = Number(existingVoucher.totalAmountOwed) - Number(existingVoucher.outstandingAmount) || 0;
      const newBalance = totalBillAmount - currentPaid;

      const voucherUpdateData = {
        voucherNo: voucherNo || existingVoucher.voucherNo,
        amount: Number(totalBillAmount),
        outstandingAmount: Number(newBalance),
        totalAmountOwed: Number(totalBillAmount),
        month: billingMonth,
        particulars: description || existingVoucher.particulars,
        details: description || existingVoucher.details
      };

      const updatedVoucher = await unifiedVoucherRepository.preload({
        id: billId,
        ...voucherUpdateData
      });
      if (updatedVoucher) {
        await unifiedVoucherRepository.save(updatedVoucher);
      }
    
      console.log('Updated voucher:', updatedVoucher ? updatedVoucher : false);

      if (!updatedVoucher) {
        throw new CustomError(
          statusCodes?.notFound,
          Message?.notFound,
          errorCodes?.not_found
        );
      }

      return existingVoucher;
    } else {
      throw new CustomError(
        statusCodes?.notFound,
        Message?.notFound,
        errorCodes?.not_found
      );
    }
  } catch (voucherError) {
    console.error('Error updating UnifiedVoucher for bill:', voucherError);
    throw voucherError;
  }

};

export const getMonthlyBillData = async (req, res) => {
  const { companyId, year } = req.query;
  const query = billRepository
    .createQueryBuilder("bill")
    .select("bill.company_id", "companyId")
    .addSelect("EXTRACT(YEAR FROM bill.billing_month)", "year")
    .addSelect("EXTRACT(MONTH FROM bill.billing_month)", "month")
    .addSelect("bill.status", "status")
    .addSelect("SUM(bill.total_bill_amount_after_gst)", "totalBillAmountAfterGST")
    .addSelect("SUM(bill.totalgst)", "totalGST")
    .addSelect("jsonb_agg(to_jsonb(bill))", "bills")
    .where("bill.is_deleted = :deleted", { deleted: false });

  if (companyId) {
    query.andWhere("bill.company_id = :companyId", { companyId });
  }

  if (year) {
    query
      .andWhere("bill.billing_month >= :startDate", {
        startDate: new Date(`${year}-01-01T00:00:00.000Z`)
      })
      .andWhere("bill.billing_month < :endDate", {
        endDate: new Date(`${parseInt(year) + 1}-01-01T00:00:00.000Z`)
      });
  }

  const rows = await query
    .groupBy("bill.company_id")
    .addGroupBy("EXTRACT(YEAR FROM bill.billing_month)")
    .addGroupBy("EXTRACT(MONTH FROM bill.billing_month)")
    .addGroupBy("bill.status")
    .orderBy("EXTRACT(YEAR FROM bill.billing_month)", "ASC")
    .addOrderBy("EXTRACT(MONTH FROM bill.billing_month)", "ASC")
    .getRawMany();

  const result = rows.map((row) => ({
    companyId: row.companyId,
    year: Number(row.year),
    month: Number(row.month),
    totalBillAmountAfterGST: Number(row.totalBillAmountAfterGST),
    totalGST: Number(row.totalGST),
    bills: row.bills
  }));

  return result;

}

export const getTotalSalesForMonth = async (req) => {
  const { companyId, year } = req?.query;
  const query = billRepository
    .createQueryBuilder("bill")
    .select("EXTRACT(MONTH FROM bill.updated_at)", "month")
    .addSelect("SUM(bill.total_bill_amount_after_gst)", "total_sales_amount")
    .where("bill.is_deleted = :deleted", { deleted: false })
    .andWhere("bill.status = :status", { status: true });

  if (companyId) {
    query.andWhere("bill.company_id = :companyId", { companyId });
  }

  if (year) {
    query
      .andWhere("bill.updated_at >= :startDate", {
        startDate: new Date(`${year}-01-01`)
      })
      .andWhere("bill.updated_at < :endDate", {
        endDate: new Date(`${parseInt(year) + 1}-01-01`)
      });
  }

  const totalAmount = await query
    .groupBy("EXTRACT(MONTH FROM bill.updated_at)")
    .orderBy("EXTRACT(MONTH FROM bill.updated_at)", "ASC")
    .getRawMany();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const formattedData = months.map((month, index) => {
    const monthData = totalAmount.find((data) => Number(data.month) === index + 1);
    return monthData ? Number(monthData.total_sales_amount) : 0;
  });
  return formattedData;
};

export const getMonthlyPaidForTenant = async (req) => {
  const { tenantId, year } = req?.query;
  const query = billRepository
    .createQueryBuilder("bill")
    .select("bill.updated_at", "updatedAt")
    .addSelect("bill.total_bill_amount_after_gst", "totalBillAmountAfterGST")
    .where("bill.is_deleted = :deleted", { deleted: false })
    .andWhere("bill.status = :status", { status: true })
    .andWhere("bill.tenant_id = :tenantId", { tenantId });

  if (year) {
    query
      .andWhere("bill.updated_at >= :startDate", {
        startDate: new Date(`${year}-01-01`)
      })
      .andWhere("bill.updated_at < :endDate", {
        endDate: new Date(`${parseInt(year) + 1}-01-01`)
      });
  }

  const bills = await query.getRawMany();

  // Initialize an array for each month's payment (12 months)
  const paidArray = new Array(12).fill(0);

  bills.forEach(bill => {
    const month = new Date(bill.updatedAt).getMonth();
    paidArray[month] += Number(bill.totalBillAmountAfterGST);
  });

  return paidArray;
};

export const getTotalSalesForYear = async (req) => {
  const { companyId, year } = req?.query;
  const query = billRepository
    .createQueryBuilder("bill")
    .select("SUM(bill.total_bill_amount_after_gst)", "total_sales_amount")
    .where("bill.is_deleted = :deleted", { deleted: false })
    .andWhere("bill.status = :status", { status: true });

  if (companyId) {
    query.andWhere("bill.company_id = :companyId", { companyId });
  }
  if (year) {
    query
      .andWhere("bill.created_at >= :startDate", {
        startDate: new Date(`${year}-01-01`)
      })
      .andWhere("bill.created_at < :endDate", {
        endDate: new Date(`${parseInt(year) + 1}-01-01`)
      });
  }

  const totalYearlySalesRow = await query.getRawOne();
  const totalYearlySales = totalYearlySalesRow?.total_sales_amount == null
    ? []
    : [{ _id: null, total_sales_amount: Number(totalYearlySalesRow.total_sales_amount) }];

  return totalYearlySales

};

export const totalPendingBills = async (req) => {
  const companyId = req.query.id;
  const bill = await billRepository.find({
    where: { companyId, status: false }
  });

  if (!bill) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }
  return bill;
};

export const totalPaidBills = async (req) => {
  const companyId = req.query.id;
  const bill = await billRepository.find({
    where: { companyId, status: true }
  });

  if (!bill) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }
  return bill;
};

export const billVoucher = async (req, res) => {
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
            const finalVoucherType = voucherType || 'BILL';
            const timestamp = Date.now().toString().slice(-7);
            finalVoucherNo = `${finalVoucherType}-${timestamp}`;
        }

        if (!companyId) {
            throw new CustomError(400, 'companyId is required');
        }

        // If _id is provided, this is a payment against existing bill
        if (_id) {
            // Find the bill record
            const billRecord = await billRepository.findOne({
                where: {
                  id: _id,
                  companyId,
                  isDeleted: false
                }
            });

            if (!billRecord) {
                console.log(billRecord);
                throw new CustomError(
                    statusCodes?.badRequest,
                    "Failed to find bill record",
                    "bill_record_not_found"
                );
            }

            // Update bill status to paid
            await billRepository.update(
              { id: billRecord.id },
              { status: true }
            );

            // Create payment voucher
            const data = unifiedVoucherRepository.create({
                voucherNo: finalVoucherNo,
                voucherType: voucherType || 'BILL',
                companyId,
                date: date || new Date(),
                month: month,
                particulars: particulars || `Payment for bill`,
                debit: {
                    accountId: debit?.accountId,
                    accountType: debit?.accountType || 'TransactionAccount',
                    accountName: debit?.accountName || 'Cash/Bank'
                },
                credit: {
                    accountId: credit?.accountId,
                    accountType: credit?.accountType || 'Tenant',
                    accountName: credit?.accountName || 'Tenant Account'
                },
                amount,
                outstandingAmount: 0,
                totalAmountOwed: amount,
                sourceDocument: sourceDocument || {
                    referenceId: _id,
                    referenceModel: 'Bill'
                },
                status: status || 'approved',
                paymentStatus: 'paid',
                tags: tags || ['Payment', 'Bill'],
                details: Details || `Payment for bill`
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
                voucherType: voucherType || 'BILL',
                companyId,
                date: date || new Date(),
                month: month,
                particulars: particulars || Details || 'Bill voucher created',
                debit: debit,
                credit: credit,
                amount: amount,
                status: status || 'draft',
                tags: tags || ['Voucher', voucherType || 'BILL'],
                details: Details || 'Bill voucher created'
            };

            // Add optional fields if they exist
            if (sourceDocument) voucherData.sourceDocument = sourceDocument;

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
        console.error('Error in billVoucher:', error);
        throw error;
    }
};