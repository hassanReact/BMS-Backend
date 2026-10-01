import AppDataSource from "../core/database/data-source.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import { sendEmail } from "../core/helpers/mail.js";
import sendWhatsApp from "../core/helpers/twillio.js";

const propertyRepository = AppDataSource.getRepository("Property");
const propertyImgRepository = AppDataSource.getRepository("PropertyImg");
const ownerRepository = AppDataSource.getRepository("Owner");
const typeRepository = AppDataSource.getRepository("Type");
const companyRepository = AppDataSource.getRepository("Company");

const isValidUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value
  );

export const createProperty = async (req, res) => {
  const {
    propertyname,
    typeId,
    description,
    address,
    zipcode,
    maplink,
    rent,
    area,
    ownerId,
    tenantId,
    projectId,
    blockId,
    accountName,
    companyId,
  } = req.body;

  let filePaths = [];
  if (req.files && req.files.length > 0) {
    filePaths = req.files.map((file) => `uploads/${file.filename}`);
  }

  const property = await propertyRepository.save({
    propertyname,
    typeId: typeId !== "null" && isValidUuid(typeId) ? typeId : null,
    description,
    address,
    zipcode,
    maplink,
    rent,
    area,
    ownerId: ownerId !== "null" && isValidUuid(ownerId) ? ownerId : null,
    tenantId: tenantId !== "null" && isValidUuid(tenantId) ? tenantId : null,
    projectId,
    blockId,
    accountName,
    companyId,
    files: filePaths,
  });

  if (!property) {
    throw new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }

  if (
    ownerId !== "null" &&
    typeId !== "null" &&
    isValidUuid(ownerId) &&
    isValidUuid(typeId)
  ) {
    const type = await typeRepository.findOne({ where: { id: typeId } });
    const owner = await ownerRepository.findOne({ where: { id: ownerId } });
    const CompanyDetails = await companyRepository.findOne({ where: { id: companyId } });

    if (owner && type && CompanyDetails) {
      if (process.env.FEATURE_EMAIL == "on" && CompanyDetails.isMailStatus) {
        await sendMailToOwnerEmail(owner, property, CompanyDetails, type);
      }
      if (process.env.FEATURE_WHATSAAP == "on" && CompanyDetails.whatappStatus) {
        await sendWhatsAppMessage(owner, property, CompanyDetails, type);
      }
    }
  }

  return property;
};

const sendWhatsAppMessage = async (owner, property, CompanyDetails, type) => {
  try {
    const ownerWhatsAppText = `
    🎉 Hello ${owner.ownerName},
    
    Your property has been successfully registered with *${CompanyDetails.companyName}*! 🏡
    
    📝 Property Details:
    • 🏠 Name: ${property.propertyname}
    • 📂 Type: ${type.name}
    • 🧾 Description: ${property.description}
    • 📍 Address: ${property.address}, ${property.zipcode}
    • 📏 Area: ${property.area}
    
    🌐 View it on the map: ${property.maplink}
    
    Thank you for trusting us. If you have any questions, reach us at 📧 ${CompanyDetails.email}.
    
    — The ${CompanyDetails.companyName} Team
    `;

    return sendWhatsApp(owner?.phoneNo, ownerWhatsAppText);
  } catch (err) {
    console.error("Failed to send tenant registration email:", err);
  }
};

export const sendMailToOwnerEmail = async (
  owner,
  property,
  companyDetails,
  type
) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333;">

        <!-- Header Section -->
        <div style="background-color: #4CAF50; color: white; padding: 15px; text-align: center;">
          <h2 style="margin: 0;">Congratulations on Registering Your Property with ${companyDetails.companyName}!</h2>
        </div>

        <!-- Body Section -->
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #ddd; padding: 20px; box-sizing: border-box;">
          <p style="font-size: 16px; line-height: 1.6;">Dear ${owner.ownerName},</p>
          <p style="font-size: 16px; line-height: 1.6;">We are excited to inform you that your property has been successfully registered with ${companyDetails.companyName}.</p>
          <p style="font-size: 16px; line-height: 1.6;">Below are the details of your property:</p>
          
          <ul style="font-size: 16px; line-height: 1.6;">
            <li><strong>Property Name:</strong> ${property.propertyname}</li>
            <li><strong>Type:</strong> ${type.name}</li>
            <li><strong>Description:</strong> ${property.description}</li>
            <li><strong>Address:</strong> ${property.address}, ${property.zipcode}</li>
            <li><strong>Area:</strong> ${property.area}</li>
          </ul>

          <p style="font-size: 16px; line-height: 1.6;">You can also view your property on the map: <a href="${property.maplink}" style="color: #4CAF50;">View Map</a></p>
          <p style="font-size: 16px; line-height: 1.6;">Thank you for trusting us with your property registration. If you have any questions or need further assistance, feel free to reach out to us.</p>
        </div>

        <!-- Footer Section -->
        <div style="background-color: #f4f4f4; color: #777; text-align: center; padding: 15px;">
          <p style="margin: 0;">Best regards,</p>
          <p style="margin: 0;"><strong>The ${companyDetails.companyName} Team</strong></p>
          <p>${companyDetails.email}</p>
        </div>
      </div>
    `;

    await sendEmail(
      owner.email,
      "Property Registration Confirmation",
      htmlContent,
      companyDetails.id
    );
  } catch (err) {
    console.error("Failed to send property registration email:", err);
  }
};

export const editProperty = async (req, res) => {
  const propertyId = req.query.id;

  if (!propertyId) {
    return res.status(400).json({
      message: "Property ID is required.",
      errorCode: "property_id_missing",
    });
  }

  const {
    propertyname,
    typeId,
    description,
    address,
    zipcode,
    maplink,
    rent,
    area,
    ownerId,
    tenantId,
    projectId,
    blockId,
    accountName,
    companyId,
  } = req.body;

  let filePath = null;
  if (req.files && req.files.length > 0) {
    const file = req.files[0];
    if (file?.filename) {
      filePath = `uploads/property/${file.filename}`;
    } else {
      return res.status(400).json({
        message: "File upload failed",
        errorCode: "file_upload_error",
      });
    }
  }

  const updateData = {
    propertyname,
    typeId,
    description,
    address,
    zipcode,
    maplink,
    rent,
    area,
    ownerId,
    tenantId,
    projectId,
    blockId,
    accountName,
    companyId,
    ...(filePath && { files: filePath }),
  };

  const property = await propertyRepository.findOne({ where: { id: propertyId } });

  if (!property) {
    return res.status(404).json({
      message: "Property not found.",
      errorCode: "property_not_found",
    });
  }

  propertyRepository.merge(property, updateData);
  const updatedProperty = await propertyRepository.save(property);

  return updatedProperty;
};

export const uploadImages = async (req, res, next) => {
  const { name, propertyId } = req.body;

  const document = await propertyImgRepository.save({
    propertyId,
    documentName: name,
    url: `uploads/${req.file.filename}`,
  });

  if (!document) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return document;
};

export const getAllImages = async (req, res, next) => {
  const { id: propertyId } = req.query;

  const propertyImg = await propertyImgRepository.find({
    where: { propertyId },
    order: { createdAt: "DESC" },
  });

  if (!propertyImg) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return propertyImg;
};

export const getProperty = async (req, res, next) => {
  const companyId = req.query.id;
  const Properties = await propertyRepository.find({
    where: { companyId, isDeleted: false, isVacant: true },
    order: { createdAt: "DESC" },
  });
  if (!Properties) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }
  return Properties;
};

export const getAllProperties = async (req, res, next) => {
  const companyId = req.query.id;
  const Properties = await propertyRepository.find({
    where: { companyId, isDeleted: false },
    relations: ["type", "project", "block"],
    order: { createdAt: "DESC" },
  });
  if (!Properties) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }
  return Properties;
};

export const getVacantProperty = async (req, res, next) => {
  const companyId = req.query.id;
  const Properties = await propertyRepository.find({
    where: { companyId, isDeleted: false, isVacant: true },
    order: { createdAt: "DESC" },
  });
  if (!Properties) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }
  return Properties;
};

export const deleteProperty = async (req, res) => {
  const propertyId = req.query.id;

  const property = await propertyRepository.findOne({ where: { id: propertyId } });
  if (!property) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  property.isDeleted = true;
  await propertyRepository.save(property);

  return property;
};

export const deletePropertyImg = async (req, res) => {
  const propertyId = req.query.id;

  const property = await propertyImgRepository.findOne({ where: { id: propertyId } });

  if (!property) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  await propertyImgRepository.remove(property);
  return property;
};

export const getPropertyById = async (req, res) => {
  const propertyId = req.query.id;

  const property = await propertyRepository.findOne({
    where: { id: propertyId },
    relations: ["type", "owner", "tenant", "project", "block"],
  });

  if (!property) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound || "Resident not found",
      errorCodes?.not_found
    );
  }
  return property;
};

export const uploadProperty = async (req, res) => {
  const { id } = req.query;
  const company = await companyRepository.findOne({ where: { id } });
  if (!company) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }
  const Files = req.files;
  if (!req.files === 0) {
    return res.status(400).send("No files uploaded.");
  }
  return Files;
};
