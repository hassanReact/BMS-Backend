import Tenant from "../models/tenant.model.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import Booking from "../models/booking,model.js";
import Agent from "../models/staff.model.js";
import Company from "../models/company.model.js";
import TenantDocs from "../models/tenantDocs.model.js";
import {sendEmail} from "../core/helpers/mail.js";
import ExcelJS from 'exceljs';
import bcrypt from 'bcrypt';
import sendWhatsApp from "../core/helpers/twillio.js"
import Property from "../models/property.model.js";

export const createTenant = async (req) => {
  const {
    tenantName,
    email,
    password,
    phoneno,
    identityCardType,
    identityNo,
    address,
    reporterId,
    //accountName,
    companyId,
    documents,
  } = req.body;

  const [isCompanyAlreadyExist, isAgentAlreadyExist, isStudentAlreadyExist] =
    await Promise.all([
      Company.findOne({ email, isDeleted: false }),
      Agent.findOne({ email, isDeleted: false }),
      Tenant.findOne({ email, isDeleted: false }),
    ]);

  if (isCompanyAlreadyExist || isAgentAlreadyExist || isStudentAlreadyExist) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  const uploadedFiles = req.files.map((file) => ({
    filetype: file.mimetype,
    name: file.originalname,
    url: `uploads/tenant/${file.filename}`,
  }));

  const tenant = await Tenant.create({
    tenantName,
    email,
    password,
    phoneno,
    identityCardType,
    identityNo,
    files: uploadedFiles,
    address,
    reporterId,
    //accountName,
    companyId,
  });

  if (!tenant) {
    throw new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }

  const CompanyDetails = await Company.findById(companyId);
  if(CompanyDetails && process.env.FEATURE_EMAIL == 'on' && CompanyDetails.isMailStatus){
   await sendEmailToTenant(tenant,CompanyDetails);
  }
  if (CompanyDetails && process.env.FEATURE_WHATSAAP == 'on' && CompanyDetails.whatappStatus) {
  await sendWhatsAppMessage(tenant, CompanyDetails);
  }

  const createdTenant = await Tenant.findById(tenant._id).select(
    "-password -refreshToken"
  );

  return createdTenant;
};

const sendWhatsAppMessage = async (tenant, CompanyDetails) => {
  try {
   
    const tenantWhatsAppText = 
    `👋 Hey ${tenant?.tenantName}!
    
    Welcome to *${CompanyDetails.companyName}* 🎉
    
    Thank you for registering with us. Here are your registration details:
    
    📛 Name: ${tenant?.tenantName}
    📧 Email: ${tenant?.email}
    📱 Phone: ${tenant?.phoneno}
    🏠 Address: ${tenant?.address}
    
    If you have any questions, feel free to reach out to us at: ${CompanyDetails.email}
    
    - The ${CompanyDetails.companyName} Team`;
    
    return sendWhatsApp(
      tenant?.phoneno,
      tenantWhatsAppText
    );
  } catch (err) {
    console.error("Failed to send tenant registration email:", err);
  }
};


const sendEmailToTenant = async (tenant, CompanyDetails) => {
  try {
   
    const tenantDetails = `
  <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333;">
    
    <!-- Header Section -->
    <div style="background-color: #4CAF50; color: white; padding: 15px; text-align: center;">
      <h2 style="margin: 0;">Welcome to ${CompanyDetails.companyName}</h2>
    </div>

    <!-- Body Section -->
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #ddd; padding: 20px; box-sizing: border-box;">
      <p style="font-size: 16px; line-height: 1.6;">Dear ${tenant?.tenantName},</p>
      <p style="font-size: 16px; line-height: 1.6;">Thank you for registering with <strong>${CompanyDetails.companyName}</strong>. We are excited to have you on board. Below are your registration details:</p>
      <ul style="font-size: 16px; line-height: 1.6;">
        <li><strong>Name:</strong> ${tenant?.tenantName}</li>
        <li><strong>Email:</strong> ${tenant?.email}</li>
        <li><strong>Phone:</strong> ${tenant?.phoneno}</li>
        <li><strong>Address:</strong> ${tenant?.address}</li>
      </ul>
      <p style="font-size: 16px; line-height: 1.6;">We look forward to a smooth and pleasant stay. If you have any questions or need assistance, feel free to contact us.</p>
    </div>

    <!-- Footer Section -->
    <div style="background-color: #f4f4f4; color: #777; text-align: center; padding: 15px;">
      <p style="margin: 0;">Best regards,</p>
      <p style="margin: 0;"><strong>The ${CompanyDetails.companyName} Team</strong></p>
      <p>${CompanyDetails.email}</p>
    </div>
  </div>
`;

    // Send the email with tenant details
    return sendEmail(
      tenant?.email,
      "Welcome to Your New Home - Tenant Registration Details",
      tenantDetails,
      CompanyDetails._id
    );
  } catch (err) {
    console.error("Failed to send tenant registration email:", err);
  }
};


const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const tenant = await Tenant.findById(userId);
    const accessToken = tenant.generateAccessToken();
    const refreshToken = tenant.generateRefreshToken();

    tenant.refreshToken = refreshToken;
    await tenant.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new CustomError(
      statusCodes?.internalServerError,
      "Something went wrong while generating refresh and access tokens.",
      errorCodes?.server_error
    );
  }
};

export const loginTenant = async (req, res) => {
  const { email, password } = req.body;

  const tenant = await Tenant.findOne({ email });
  if (!tenant) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const passwordVerify = await tenant.isPasswordCorrect(password);

  if (!passwordVerify) {
    throw new CustomError(
      statusCodes?.badRequest,
      Message?.inValid,
      errorCodes?.invalid_credentials
    );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    tenant._id
  );

  const loginTenant = await Tenant.findById(tenant._id).select(
    "-password -refreshToken"
  );

  res.setHeader("token", accessToken);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return {
    accessToken,
    refreshToken,
    options,
    loginTenant,
  };
};

export const getTenants = async (req, res, next) => {
  const { id: companyId } = req.query;

  const tenants = await Tenant.find({
    companyId,
    //isOccupied: false,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  if (!tenants) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound || "No tenants found",
      errorCodes?.not_found
    );
  }

  return tenants;
};

export const mybooking = async (req, res, next) => {
  const Id = req.query.id;

  const tenantBooking = await Booking.find({ tenantId: Id, isDeleted: false })
    .populate("tenantId", "tenantName")
    .populate("propertyId", "propertyname")
    .sort({ createdAt: -1 })
    .lean();

  if (!tenantBooking) {
    throw new CustomError(
      statusCodes?.badRequest,
      "Tenant ID is required.",
      errorCodes?.missing_parameter
    );
  }

  const finalResponse = [];
  for (const booking of tenantBooking) {
    const createdBy = booking.createdBy;

    let creater = await Agent.findById(createdBy);
    let name;
    if (creater) {
      name = creater.agentName;
    } else {
      creater = await Company.findById(createdBy);
      if (creater) {
        name = creater.companyName;
      }
    }
    finalResponse.push({ name, ...booking });
  }

  return finalResponse;
};

export const myproperties = async (req, res, next) => {
  const Id = req.query.id;

  const propertyData = await Property.find({ tenantId: Id, isDeleted: false, isVacant: false })
    .populate("tenantId", "tenantName")
    .sort({ createdAt: -1 })
    .lean();

  if (!propertyData) {
    throw new CustomError(
      statusCodes?.badRequest,
      "Property ID is required.",
      errorCodes?.missing_parameter
    );
  }

  const finalResponse = [];
  for (const properties of propertyData) {
    const createdBy = properties.createdBy;

    let creater = await Agent.findById(createdBy);
    let name;
    if (creater) {
      name = creater.agentName;
    } else {
      creater = await Company.findById(createdBy);
      if (creater) {
        name = creater.companyName;
      }
    }
    finalResponse.push({ name, ...properties });
  }

  return finalResponse;
};

export const editTenant = async (req, res) => {
  const tenantId = req.query.id;
  const updateData = req.body;

  if (!tenantId) {
    throw new CustomError(
      statusCodes?.badRequest,
      Message?.inValid,
      errorCodes?.missing_parameter
    );
  }

  const updatedTenant = await Tenant.findByIdAndUpdate(tenantId, updateData, {
    new: true,
    runValidators: true,
  }).select("-password -refreshToken");

  if (!updatedTenant) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }
  return updatedTenant;
};

export const deleteTenantById = async (req, res) => {
  const tenantId = req.query.id;

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }

  tenant.isDeleted = true;
  await tenant.save();

  return tenant;
};

export const getTenantsById = async (req, res, next) => {
  const { id } = req.query;

  if (!id) {
    throw new CustomError(
      statusCodes?.badRequest,
      Message?.notFound,
      errorCodes?.invalid_request
    );
  }
  const tenant = await Tenant.findById(id);

  if (!tenant) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound || "No tenant found",
      errorCodes?.not_found
    );
  }

  const bookings = await Booking.find({ tenantId: id }).populate("propertyId");

  const formattedBookings = bookings.map((bookingData) => ({
    propertyName: bookingData.propertyId?.propertyname,
    description: bookingData.propertyId?.description,
    rent: bookingData.propertyId?.rent,
    address: bookingData.propertyId.address,
  }));
  return {
    tenant,
    booking: formattedBookings,
  };
};

export const getAllTenants = async (req, res, next) => {
  const { id: companyId } = req.query;

  const tenants = await Tenant.find({
    companyId,
    isDeleted: false,
  })
    .lean()
    .sort({ createdAt: -1 });

  if (!tenants) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const finalResponse = [];
  for (const tenat of tenants) {
    const reporterId = tenat.reporterId;

    let creater = await Agent.findById(reporterId);
    let Creater;
    if (creater) {
      Creater = creater.agentName;
    } else {
      creater = await Company.findById(reporterId);
      if (creater) {
        Creater = creater.companyName;
      }
    }
    finalResponse.push({ Creater, ...tenat });
  }

  return finalResponse;
};

export const getAllDocs = async (req, res, next) => {
  const { id: tenantId } = req.query;

  const tenantsDocs = await TenantDocs.find({
    tenantId,
    // isDeleted: false,
  }).sort({ createdAt: -1 });

  if (!tenantsDocs) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }

  return tenantsDocs;
};

export const uploadDocuments = async (req, res, next) => {
  // const tenantId = req.query.id;

  const { name, tenantId } = req.body;

  const document = await TenantDocs.create({
    tenantId,
    documentName: name,
    url: `uploads/${req.file.filename}`,
  });

  if (!document) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }

  return document;
};

export const getMyTenants = async (req, res) => {
  const id = req.query.id;
  const tenant = await Tenant.find({ reporterId: id, isDeleted: false })
    .lean()
    .sort({ createdAt: -1 });
  if (!tenant) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }

  const finalResponse = [];
  for (const tenat of tenant) {
    const reporterId = tenat.reporterId;

    let creater = await Agent.findById(reporterId);
    let Creater;
    if (creater) {
      Creater = creater.agentName;
    } else {
      creater = await Company.findById(reporterId);
      if (creater) {
        Creater = creater.companyName;
      }
    }
    finalResponse.push({ Creater, ...tenat });
  }
  return finalResponse;
};

export const deleteTenantDocs = async (req, res) => {
  const tenantId = req.query.id;

  const tenantDocs = await TenantDocs.findByIdAndDelete(tenantId);

  if (!tenantDocs) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }
  return tenantDocs;
};

export const bulkUploadTenants = async (req) => {
    const file = req?.file?.path;
    if (!file) {
      throw new CustomError(
        statusCodes?.badRequest,
        Message?.fileNotProvided,
        errorCodes?.file_missing
      );
    }

    const { reporterId, companyId } = req.body;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    const worksheet = workbook.worksheets[0];

    const tenants = [];
    const keysToCheck = ["tenantName", "email", "phoneno", "identityCardType", "identityNo"];
    const createdTenants = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; 

      const tenant = {
        tenantName: row.getCell(1)?.text?.trim() || '',
        password: '1234', 
        email: row.getCell(2)?.text?.trim() || '',
        phoneno: row.getCell(3)?.text?.trim() || '',
        identityCardType: row.getCell(4)?.text?.trim() || '',
        identityNo: row.getCell(5)?.text?.trim() || '',
        reporterId,
        companyId
      };

      // Validate required fields
      if (!keysToCheck.every((key) => tenant[key])) {
        throw new CustomError(
          statusCodes.badRequest,
          Message?.rowMissing,
          errorCodes.invalid_format
        );
      }

      tenants.push(tenant);
    });

    for (const tenant of tenants) {
        const existingTenant = await Tenant.findOne({
          $or: [
            { tenantName: tenant.tenantName, isDeleted: false },
            { email: tenant.email, isDeleted: false }
          ]
        });

        if (existingTenant) {
          continue;
        }

        const hashedPassword = await bcrypt.hash(tenant.password, 10);
        tenant.password = hashedPassword;

        const newTenant = await Tenant.create(tenant);
        if (!newTenant) {
          throw new CustomError(
            statusCodes.badRequest,
            `Failed to create tenant ${tenant.tenantName}`,
            errorCodes.not_created
          );
        }

        createdTenants.push(newTenant);

    }

    if (createdTenants.length === 0) {
      throw new CustomError(
        statusCodes.badRequest,
        'No new tenants were created',
        errorCodes.not_created
      );
    }

    return createdTenants

};

export const changePassword = async (req) => {
  const { id, newPassword } = req.body;

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const result = await Tenant.findByIdAndUpdate(id, {
    $set: {
      password: hashedPassword,
    },
  });
  return result;
};