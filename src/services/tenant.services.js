import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import {sendEmail} from "../core/helpers/mail.js";
import ExcelJS from 'exceljs';
import sendWhatsApp from "../core/helpers/twillio.js"
import AppDataSource from "../core/database/data-source.js";
import { hashPassword, comparePassword } from "./user.services.js";
import jwt from "jsonwebtoken";

const getRepository = (entityName) => AppDataSource.getRepository(entityName);


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
    companyId,
  } = req.body;

  let createdTenant;

  await AppDataSource.transaction(async (transactionalEntityManager) => {
    const roleRepository = transactionalEntityManager.getRepository("Role");
    const userRepository = transactionalEntityManager.getRepository("User");
    const userRoleRepository = transactionalEntityManager.getRepository("UserRole");
    const tenantRepository = transactionalEntityManager.getRepository("Tenant");

      // 1. Find Tenant role
      const tenantRole = await roleRepository.findOne({ where: { name: "Tenant" } });

      if (!tenantRole) {
        throw new CustomError(
          statusCodes?.notFound,
          "Tenant role not found",
          errorCodes?.not_found
        );
      }

      // 2. Find existing User
      let user = await userRepository.findOne({
        where: { email: email.toLowerCase().trim(), isDeleted: false },
      });

      if(user){
        throw new CustomError(
          statusCodes?.conflict,
          Message?.alreadyExist,
          errorCodes?.already_exist
        );
      }

      // 3. Create User only if it doesn't exist
      if (!user) {
        user = userRepository.create({
          fullname: tenantName,
          email: email.toLowerCase().trim(),
          password: await hashPassword(password),
          phoneNo: phoneno,
        });
        await userRepository.save(user);
      }


      // 5. Create UserRole
      const userRole = userRoleRepository.create({
        userId: user.id,
        roleId: tenantRole.id,
        companyId,
      });
      await userRoleRepository.save(userRole);

      // 6. Create Tenant profile
      createdTenant = tenantRepository.create({
        userId: user.id,
        tenantName,
        email: user.email,
        phoneno,
        identityCardType,
        identityNo,
        address,
        reporterId,
        companyId,
      });
      await tenantRepository.save(createdTenant);
  });

    // External operations AFTER transaction
    const companyDetails = await getRepository("Company").findOne({ where: { id: companyId } });

    if (
      companyDetails &&
      process.env.FEATURE_EMAIL === "on" &&
      companyDetails.isMailStatus
    ) {
      await sendEmailToTenant(createdTenant, companyDetails);
    }

    if (
      companyDetails &&
      process.env.FEATURE_WHATSAAP === "on" &&
      companyDetails.whatappStatus
    ) {
      await sendWhatsAppMessage(createdTenant, companyDetails);
    }

    return await getRepository("Tenant").findOne({ where: { id: createdTenant.id } });
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
      CompanyDetails.id
    );
  } catch (err) {
    console.error("Failed to send tenant registration email:", err);
  }
};


const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const tenant = await getRepository("Tenant").findOne({ where: { id: userId } });
    const user = tenant
      ? await getRepository("User").findOne({ where: { id: tenant.userId } })
      : null;
    const userRole = user
      ? await getRepository("UserRole").findOne({
          where: { userId: user.id, status: "active" },
          relations: { role: true, company: true },
        })
      : null;
    const payload = {
      userId: user.id,
      email: user.email,
      role: userRole?.role?.name,
      roleId: userRole?.role?.id,
      companyId: userRole?.company?.id || null,
    };
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });

    user.refreshToken = refreshToken;
    await getRepository("User").save(user);
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

  const tenant = await getRepository("Tenant").findOne({ where: { email } });
  if (!tenant) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const user = await getRepository("User").findOne({ where: { id: tenant.userId } });
  const passwordVerify = await comparePassword(password, user.password);

  if (!passwordVerify) {
    throw new CustomError(
      statusCodes?.badRequest,
      Message?.inValid,
      errorCodes?.invalid_credentials
    );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    tenant.id
  );

  const loginTenant = await getRepository("Tenant").findOne({ where: { id: tenant.id } });

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

  const tenants = await getRepository("Tenant").find({
    where: { companyId, isDeleted: false },
    order: { createdAt: "DESC" },
  });

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

  const tenantBooking = await getRepository("Booking").find({
    where: { tenantId: Id, isDeleted: false },
    relations: { tenant: true, property: true },
    order: { createdAt: "DESC" },
  });

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

    let creater = await getRepository("Agent").findOne({ where: { id: createdBy } });
    let name;
    if (creater) {
      name = creater.agentName;
    } else {
      creater = await getRepository("Company").findOne({ where: { id: createdBy } });
      if (creater) {
        name = creater.companyName;
      }
    }
    const { tenant, property, ...bookingData } = booking;
    finalResponse.push({
      name,
      ...bookingData,
      tenantId: tenant,
      propertyId: property,
    });
  }

  return finalResponse;
};

export const myproperties = async (req, res, next) => {
  const Id = req.query.id;

  const propertyData = await getRepository("Property").find({
    where: { tenantId: Id, isDeleted: false, isVacant: false },
    relations: { tenant: true },
    order: { createdAt: "DESC" },
  });

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

    let creater = await getRepository("Agent").findOne({ where: { id: createdBy } });
    let name;
    if (creater) {
      name = creater.agentName;
    } else {
      creater = await getRepository("Company").findOne({ where: { id: createdBy } });
      if (creater) {
        name = creater.companyName;
      }
    }
    const { tenant, ...propertyData } = properties;
    finalResponse.push({
      name,
      ...propertyData,
      tenantId: tenant,
    });
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

  const tenantRepository = getRepository("Tenant");
  const tenant = await tenantRepository.findOne({ where: { id: tenantId } });
  const updatedTenant = tenant
    ? await tenantRepository.save(Object.assign(tenant, updateData))
    : null;

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

  const tenant = await getRepository("Tenant").findOne({ where: { id: tenantId } });
  if (!tenant) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }

  tenant.isDeleted = true;
  await getRepository("Tenant").save(tenant);

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
  const tenant = await getRepository("Tenant").findOne({ where: { id, isDeleted: false } });

  if (!tenant) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound || "No tenant found",
      errorCodes?.not_found
    );
  }

  const bookings = await getRepository("Booking").find({
    where: { tenantId: id, isDeleted: false },
    relations: { property: true },
  });

  const formattedBookings = bookings.map((bookingData) => ({
    propertyName: bookingData.property?.propertyname,
    description: bookingData.property?.description,
    rent: bookingData.property?.rent,
    address: bookingData.property?.address,
  }));
  return {
    tenant,
    booking: formattedBookings,
  };
};

export const getAllTenants = async (req, res, next) => {
  const { id: companyId } = req.query;

  const tenants = await getRepository("Tenant").find({
    where: { companyId, isDeleted: false },
    order: { createdAt: "DESC" },
  });

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

    let creater = await getRepository("Agent").findOne({ where: { id: reporterId } });
    let Creater;
    if (creater) {
      Creater = creater.agentName;
    } else {
      creater = await getRepository("Company").findOne({ where: { id: reporterId } });
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

  // console.log(tenantId);

  const tenantsDocs = await getRepository("TenantDocs").find({
    where: { tenantId },
    order: { createdAt: "DESC" },
  });

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

  const tenantDocsRepository = getRepository("TenantDocs");
  const document = tenantDocsRepository.create({
    tenantId,
    documentName: name,
    url: `uploads/${req.file.filename}`,
  });
  await tenantDocsRepository.save(document);

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
  const tenant = await getRepository("Tenant").find({
    where: { reporterId: id, isDeleted: false },
    order: { createdAt: "DESC" },
  });
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

    let creater = await getRepository("Agent").findOne({ where: { id: reporterId } });
    let Creater;
    if (creater) {
      Creater = creater.agentName;
    } else {
      creater = await getRepository("Company").findOne({ where: { id: reporterId } });
      if (creater) {
        Creater = creater.companyName;
      }
    }

    if(!Creater){
      throw new CustomError(
        statusCodes?.notFound,
        "No matching active Agent or Company found for this reporter ID",
        errorCodes?.not_found
      )
    }
    finalResponse.push({ Creater, ...tenat });
  }
  return finalResponse;
};

export const deleteTenantDocs = async (req, res) => {
  const tenantId = req.query.id;

  const tenantDocsRepository = getRepository("TenantDocs");
  const tenantDocs = await tenantDocsRepository.findOne({ where: { id: tenantId } });
  if (tenantDocs) {
    await tenantDocsRepository.remove(tenantDocs);
  }

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
        const existingTenant = await getRepository("Tenant").findOne({
          where: [
            { tenantName: tenant.tenantName, isDeleted: false },
            { email: tenant.email, isDeleted: false },
          ],
        });

        if (existingTenant) {
          continue;
        }

        tenant.password = await hashPassword(tenant.password);

        const tenantRepository = getRepository("Tenant");
        const newTenant = tenantRepository.create(tenant);
        await tenantRepository.save(newTenant);
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

  const hashedPassword = await hashPassword(newPassword);

  const userRepository = getRepository("User");
  const tenant = await getRepository("Tenant").findOne({ where: { id } });
  const user = tenant ? await userRepository.findOne({ where: { id: tenant.userId } }) : null;
  const result = user ? await userRepository.save(Object.assign(user, { password: hashedPassword })) : null;
  return result;
};