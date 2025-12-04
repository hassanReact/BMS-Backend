import Bill from "../models/billing.model.js";
import Property from "../models/property.model.js";
import Tenant from "../models/tenant.model.js";
import {
  errorCodes,
  invoicePrefix,
  Message,
  statusCodes,
} from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import crypto from "crypto";
import { sendEmail } from "../core/helpers/mail.js"
import Agent from "../models/agents.model.js";
import Company from "../models/company.model.js";
import mongoose from 'mongoose';
import { type } from "os";
import AccountsReceivable from "../models/accountsReceiveable.model.js";
import AccountsVoucher from "../models/accountsVoucher.model.js";
import UnifiedVoucher from "../models/UnifiedVoucher.model.js";
import ExcelJS from 'exceljs';


// export const createbill = async (req, res) => {
//   const {
//     tenantId,
//     propertyId,
//     billingMonth,
//     rentAmount,
//     extraAmount,
//     electricityUnit,
//     electricityRate,
//     electricityBillAmount,
//     totalBillAmount,
//     companyId,
//     note
//   } = req.body;

//   const totalExtraAmount = extraCharges.reduce((sum, charge) => sum + charge.price, 0);

//   const newBill = await Bill.create({
//     tenantId,
//     propertyId,
//     billingMonth,
//     rentAmount,
//     extraAmount:totalExtraAmount,
//     electricityUnit,
//     electricityRate,
//     electricityBillAmount,
//     totalBillAmount,
//     companyId,
//     note
//   });

//   const property = await Property.findById(propertyId);
//   if (!property) {
//     throw new CustomError(
//       statusCodes?.notFound,
//       Message?.notFound,
//       errorCodes?.not_found
//     );
//   }

//   const tenant = await Tenant.findById(tenantId);
//   if (!tenant) {
//     throw new CustomError(
//       statusCodes?.notFound,
//       Message?.notFound,
//       errorCodes?.not_found
//     );
//   }

//   return newBill;
// };

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

  console.log("Request Body:", req.body);

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
      const existingVoucher = await UnifiedVoucher.findOne({ voucherNo: invoiceNo });
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
    const existingVoucher = await UnifiedVoucher.findOne({ voucherNo: voucherNo });
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

  const newBill = await Bill.create({
    tenantId,
    propertyId,
    billingMonth,
    bookingId,
    description,
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

  const property = await Property.findById(propertyId);
  if (!property) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  await UnifiedVoucher.create({
    voucherNo: invoiceNo,
    voucherType: 'AR',
    sourceDocument: {
      referenceId: newBill._id,
      referenceModel: 'Bill'
    },
    companyId,
    propertyId,
    propertyName: property?.propertyname || "",
    particulars: description || `Bill for ${property?.propertyname || 'Property'} - ${formattedBillingMonth}`,
    amount: {
      total: totalBillAmount,
      balance: totalBillAmount,
      paid: 0
    },
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

  const CompanyDetails = await Company.findById(companyId);

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
      const existingVoucher = await UnifiedVoucher.findOne({ voucherNo: invoiceNo });
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
      const tenant = await Tenant.findOne({
        tenantName: waterBill.tenantName,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      });

      if (!tenant) {
        console.log(`Tenant not found: ${waterBill.tenantName}`);
        continue;
      }

      // Find property by name
      const property = await Property.findOne({
        propertyname: waterBill.propertyName,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      });

      if (!property) {
        console.log(`Property not found: ${waterBill.propertyName}`);
        continue;
      }

      // Check if bill already exists for this tenant, property, and month
      const existingBill = await Bill.findOne({
        tenantId: tenant._id,
        propertyId: property._id,
        billingMonth: waterBill.billingMonth,
        companyId: new mongoose.Types.ObjectId(companyId),
        isDeleted: false
      });

      if (existingBill) {
        console.log(`Bill already exists for ${waterBill.tenantName} - ${waterBill.propertyName} for ${waterBill.billingMonth}`);
        continue;
      }

      // Generate invoice number
      const invoiceNo = await generateInvoiceNumber();

      // Create the bill
      const newBill = await Bill.create({
        tenantId: tenant._id,
        propertyId: property._id,
        billingMonth: waterBill.billingMonth,
        description: waterBill.description,
        invoiceNo: invoiceNo,
        totalBillAmount: waterBill.totalAmount,
        companyId: new mongoose.Types.ObjectId(companyId),
        createdBy: new mongoose.Types.ObjectId(createdBy),
        status: false // Unpaid by default
      });

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
      const voucher = await UnifiedVoucher.create({
        voucherNo: invoiceNo,
        voucherType: 'AR',
        sourceDocument: {
          referenceId: newBill._id,
          referenceModel: 'Bill'
        },
        companyId: new mongoose.Types.ObjectId(companyId),
        propertyId: property._id,
        propertyName: property?.propertyname || "",
        particulars: waterBill.description ? `${waterBill.description} - ${waterBill.waterUnits} units @ ${waterBill.waterRate}/unit` : `Water Bill - ${waterBill.waterUnits} units @ ${waterBill.waterRate}/unit`,
        amount: {
          total: waterBill.totalAmount,
          balance: waterBill.totalAmount,
          paid: 0
        },
        date: billingDate,
        month: waterBill.billingMonth,
        status: 'pending',
        paymentStatus: 'pending',
        dueDate: new Date(billingDate.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days from billing date
        debit: {
          accountId: tenant._id,
          accountType: 'Customer',
          accountName: tenant?.tenantName || ""
        },
        credit: {
          accountId: new mongoose.Types.ObjectId(companyId),
          accountType: "Company"
        },
        isDeleted: false
      });

      if (!voucher) {
        // If voucher creation fails, delete the bill
        await Bill.findByIdAndDelete(newBill._id);
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
      CompanyDetails._id
    );
  } catch (err) {
    console.error("Failed to send tenant bill email:", err);
  }
};



export const getAllBill = async (req) => {
  const companyId = req.query.id;
  const AllBill = await UnifiedVoucher.find(
    { companyId, isDeleted: false, voucherType: 'GB', "amount.balance": { $gt: 0 } }
  )
    .populate('sourceDocument.referenceId')
    .lean();

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
  const tenantBill = await Bill.find({ tenantId: tenantId, isDeleted: false })
    .populate("tenantId")
    .populate("propertyId")
    .sort({ createdAt: -1 });

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
  const tenantBill = await Bill.find({ tenantId: tenantId, isDeleted: false, status: false })
    .populate("tenantId")
    .populate("propertyId")
    .sort({ createdAt: -1 });

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
  const bill = await Bill.find({ bookingId: bookingId })
    .populate("tenantId")
    .populate("propertyId")
    .populate("companyId");

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
  const bill = await Bill.findById(billId)
    .populate("tenantId")
    .populate("propertyId")
    .populate("companyId");

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
  const bill = await Bill.find({ createdBy: AgentId })
    .populate("tenantId")
    .populate("propertyId")
    .populate("companyId");

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
  const bill = await Bill.find({ createdBy: AgentId, status: false });

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
  const bill = await Bill.findById(repoterId)
    .populate("tenantId")
    .populate("propertyId")
    .populate("companyId");

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

  const result = await Bill.aggregate([
    {
      $match: {
        status: true,
        isDeleted: { $ne: true },
        createdBy: new mongoose.Types.ObjectId(agentId),
        updatedAt: {
          $gte: new Date(`${year}-01-01`),
          $lt: new Date(`${year + 1}-01-01`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$updatedAt' },
        totalPaid: { $sum: '$totalBillAmountAfterGST' }
      }
    }
  ]);

  const monthlyTotals = Array(12).fill(0);

  result.forEach(item => {
    const monthIndex = item._id - 1;
    monthlyTotals[monthIndex] = item.totalPaid;
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

  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    throw new CustomError(
      statusCodes.badRequest,
      Message.invalidId,
      errorCodes.validation_error
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const companyObjectId = new mongoose.Types.ObjectId(companyId);

  const aggregation = await Bill.aggregate([
    {
      $match: {
        isDeleted: false,
        companyId: companyObjectId,
        createdAt: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: '$status',
        totalAmount: { $sum: '$totalBillAmountAfterGST' },
        count: { $sum: 1 }
      }
    }
  ]);

  const bills = await Bill.find({
    isDeleted: false,
    companyId: companyObjectId,
    createdAt: { $gte: start, $lte: end }
  }).populate('tenantId propertyId bookingId companyId');

  const properties = await Property.find({
    isDeleted: false,
    companyId: companyObjectId,
    createdAt: { $gte: start, $lte: end }
  });

  const agents = await Agent.find({
    isDeleted: false,
    companyId: companyObjectId,
    createdAt: { $gte: start, $lte: end }
  });

  const tenants = await Tenant.find({
    isDeleted: false,
    companyId: companyObjectId,
    createdAt: { $gte: start, $lte: end }
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
    if (item._id === true) {
      summary.paid = { count: item.count, totalAmount: item.totalAmount };
    } else {
      summary.unpaid = { count: item.count, totalAmount: item.totalAmount };
    }
  });
  return summary
};

export const changeBillStatus = async (req) => {
  const billId = req.query.id;
  const { paymentType } = req.body;

  const bill = await Bill.findById(billId);

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

  const CompanyDetails = await Company.findById(CompanyId);
  const property = await Property.findById(PropertyId);
  const tenant = await Tenant.findById(TenantId);

  if (CompanyDetails.isMailStatus) {
    sendTenantBillEmail(bill, property, CompanyDetails, tenant);
  };

  await bill.save();
  return bill;
};

export const deleteBill = async (req, res) => {
  const billId = req.query.id;

  const bill = await Bill.findById(billId);
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
  await bill.save();

  // Delete related records
  await AccountsReceivable.updateMany(
    { referenceId: billId, referenceModel: 'Bill', status: /^pending$/i },
    { isDeleted: true }
  );

  await AccountsVoucher.updateMany(
    { referenceId: billId, models: 'Bill', status: /^pending$/i },
    { isDeleted: true }
  );

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
    const existingVoucher = await UnifiedVoucher.findOne({
      _id: billId,
      companyId,
      isDeleted: false
    });

    console.log('Existing voucher:', existingVoucher ? existingVoucher : false);

    if (existingVoucher) {
      // Safely calculate balance to avoid NaN
      const currentPaid = Number(existingVoucher["amount.paid"]) || 0;
      const newBalance = totalBillAmount - currentPaid;

      const voucherUpdateData = {
        voucherNo: voucherNo || existingVoucher.voucherNo,
        "amount.total": Number(totalBillAmount),
        "amount.balance": Number(newBalance),
        month: billingMonth,
        particulars: description || existingVoucher.particulars,
        details: description || existingVoucher.details
      };

      const updatedVoucher = await UnifiedVoucher.findByIdAndUpdate(billId, voucherUpdateData);
    
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
  const condition_obj = { isDeleted: false };

  if (companyId) {
    condition_obj.companyId = new mongoose.Types.ObjectId(companyId);
  }

  if (year) {
    condition_obj.billingMonth = {
      $gte: new Date(`${year}-01-01T00:00:00.000Z`),
      $lt: new Date(`${parseInt(year) + 1}-01-01T00:00:00.000Z`),
    };
  }

  const result = await Bill.aggregate([
    { $match: condition_obj },
    {
      $group: {
        _id: {
          companyId: "$companyId",
          billingMonth: { $month: "$billingMonth" },
          year: { $year: "$billingMonth" },
          status: "$status"
        },
        // totalRentAmount: { $sum: "$rentAmount" }, 
        // totalExtraCharges: { $sum: "$extraAmount" }, 
        // totalBillAmount: { $sum: "$totalBillAmount" }, 
        totalBillAmountAfterGST: { $sum: "$totalBillAmountAfterGST" },
        totalGST: { $sum: "$totalgst" },
        bills: { $push: "$$ROOT" }, // Push the full document for each bill
      },
    },
    {
      $sort: { "_id.year": 1, "_id.billingMonth": 1 },
    },
    {
      $project: {
        companyId: "$_id.companyId",
        year: "$_id.year",
        month: "$_id.billingMonth",
        // totalRentAmount: 1, 
        // totalExtraCharges: 1, 
        // totalBillAmount: 1, 
        totalBillAmountAfterGST: 1,
        totalGST: 1,
        bills: 1,
      },
    },
  ]);

  return result;

}

export const getTotalSalesForMonth = async (req) => {
  const { companyId, year } = req?.query;
  const condition_obj = { isDeleted: false, status: true };
  if (companyId) {
    condition_obj.companyId = new mongoose.Types.ObjectId(companyId);
  }
  if (year) {
    condition_obj["updatedAt"] = {
      $gte: new Date(`${year}-01-01`),
      $lt: new Date(`${parseInt(year) + 1}-01-01`),
    };
  }
  const totalAmount = await Bill.aggregate([
    { $match: condition_obj },
    {
      $group: {
        _id: { $month: "$updatedAt" },
        total_sales_amount: { $sum: "$totalBillAmountAfterGST" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
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
    const monthData = totalAmount.find((data) => data._id === index + 1);
    return monthData ? monthData.total_sales_amount : 0;
  });
  return formattedData;
};

export const getMonthlyPaidForTenant = async (req) => {
  const { tenantId, year } = req?.query;

  const condition_obj = {
    isDeleted: false,
    status: true,
    tenantId: new mongoose.Types.ObjectId(tenantId)
  };

  if (year) {
    condition_obj.updatedAt = {
      $gte: new Date(`${year}-01-01`),
      $lt: new Date(`${parseInt(year) + 1}-01-01`)
    };
  }

  const bills = await Bill.find(condition_obj).select('updatedAt totalBillAmountAfterGST');

  // Initialize an array for each month's payment (12 months)
  const paidArray = new Array(12).fill(0);

  bills.forEach(bill => {
    const month = bill.updatedAt.getMonth();
    paidArray[month] += bill.totalBillAmountAfterGST;
  });

  return paidArray;
};

export const getTotalSalesForYear = async (req) => {
  const { companyId, year } = req?.query;
  const condition_obj = { isDeleted: false, status: true };

  if (companyId) {
    condition_obj.companyId = new mongoose.Types.ObjectId(companyId);
  }
  if (year) {
    condition_obj["createdAt"] = {
      $gte: new Date(`${year}-01-01`),
      $lt: new Date(`${parseInt(year) + 1}-01-01`),
    };
  }

  const totalYearlySales = await Bill.aggregate([
    { $match: condition_obj },
    {
      $group: {
        _id: null,
        total_sales_amount: { $sum: "$totalBillAmountAfterGST" },
      },
    },
  ]);

  return totalYearlySales

};

export const totalPendingBills = async (req) => {
  const companyId = req.query.id;
  const bill = await Bill.find({ companyId: companyId, status: false })

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
  const bill = await Bill.find({ companyId: companyId, status: true })

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
            const billRecord = await Bill.findOne({
                _id,
                companyId,
                isDeleted: false
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
            await Bill.updateOne(
                { _id: billRecord._id },
                { $set: { status: true } }
            );

            // Create payment voucher
            const data = await UnifiedVoucher.create({
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
                amount: {
                    balance: 0,
                    total: amount,
                    paid: amount
                },
                sourceDocument: sourceDocument || {
                    referenceId: _id,
                    referenceModel: 'Bill'
                },
                status: status || 'approved',
                paymentStatus: 'paid',
                tags: tags || ['Payment', 'Bill'],
                details: Details || `Payment for bill`
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
        console.error('Error in billVoucher:', error);
        throw error;
    }
};