import AppDataSource from "../core/database/data-source.js";
import {
  errorCodes,
  bookingPrefix,
  Message,
  statusCodes,
} from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import {sendEmail} from "../core/helpers/mail.js"
import { Between } from "typeorm";

const bookingRepository = AppDataSource.getRepository("Booking");
const propertyRepository = AppDataSource.getRepository("Property");
const tenantRepository = AppDataSource.getRepository("Tenant");
const companyRepository = AppDataSource.getRepository("Company");
const agentRepository = AppDataSource.getRepository("Agent");

export const createBooking = async (req, res) => {
  const {
    accountName,
    tenantId,
    ownerId,
    propertyId,
    startingDate,
    endingDate,
    rentAmount,
    advanceAmount,
    companyId,
    createdBy,
    projectId,
    blockId,
  } = req.body;

  
    const generateBookingNumber = () => {
      const prefix = bookingPrefix.prefix;
      const year = new Date().getFullYear().toString().slice(-2);
      const randomNumbers = Math.floor(100 + Math.random() * 900);
      return `${prefix}${year}${randomNumbers}`;
    };
  
    const bookingNo = generateBookingNumber();

  const newBooking = bookingRepository.create({
    bookingNo:bookingNo,
    accountName,
    tenantId,
    ownerId,
    propertyId,
    startingDate,
    endingDate,
    rentAmount,
    advanceAmount,
    companyId,
    projectId,
    blockId,
    createdBy,
  });
  await bookingRepository.save(newBooking);
  const property = await propertyRepository.findOne({ where: { id: propertyId } });
  property.isVacant = false;
  await propertyRepository.save(property);

  const tenant = await tenantRepository.findOne({ where: { id: tenantId } });
  tenant.isOccupied = true;
  await tenantRepository.save(tenant);

  
  const CompanyDetails = await companyRepository.findOne({ where: { id: companyId } });
  if(process.env.FEATURE_EMAIL == 'on' && CompanyDetails.isMailStatus){
    await sendBookingConfirmationEmail(tenant,property,CompanyDetails,newBooking);
  }

  if (process.env.FEATURE_WHATSAAP == 'on' && CompanyDetails.whatappStatus) {
    await sendWhatsAppMessage(tenant, property, CompanyDetails, newBooking);
  }
  


  return newBooking;
};



const sendWhatsAppMessage = async (tenant,property,CompanyDetails,newBooking) => {
  try {
   
    const bookingWhatsAppText = `
    ✅ Hello ${tenant.tenantName},
    
    Your booking with *${CompanyDetails.companyName}* is confirmed! 🎉
    
    📌 *Booking Details:*
    • 🆔 Booking ID: ${newBooking.bookingNo}
    • 🏠 Property: ${property.propertyname}
    • 🗓️ Check-in: ${new Date(newBooking.startingDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    • 🗓️ Check-out: ${new Date(newBooking.endingDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    • 💰 Rent: $${newBooking.rentAmount}
    • 💵 Advance Paid: $${newBooking.advanceAmount}
    
    We look forward to hosting you at *${property.propertyname}*. 
    Questions? Reach us at 📧 ${CompanyDetails.email}.
    
    — The ${CompanyDetails.companyName} Team
    `;
    

    
    return sendWhatsApp(
      tenant?.phoneno,
      bookingWhatsAppText
    );
  } catch (err) {
    console.error("Failed to send tenant registration email:", err);
  }
};


const sendBookingConfirmationEmail = async (tenant,property, CompanyDetails, newBooking) => {
  try {
    const bookingDetails = `
    <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333;">
      
      <!-- Header Section -->
      <div style="background-color: #4CAF50; color: white; padding: 15px; text-align: center;">
        <h2 style="margin: 0;">Your Booking Confirmation - ${CompanyDetails.companyName}</h2>
      </div>

      <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #ddd; padding: 20px; box-sizing: border-box;">
        <!-- Body Section -->
        <p style="font-size: 16px; line-height: 1.6;">Dear ${tenant?.tenantName},</p>
        <p style="font-size: 16px; line-height: 1.6;">Thank you for booking with <strong>${CompanyDetails.companyName}</strong>. Your booking has been successfully confirmed. Below are the details of your booking:</p>
        
        <ul style="font-size: 16px; line-height: 1.6;">
          <li><strong>Booking ID:</strong> ${newBooking.bookingNo}</li>
          <li><strong>Property Name:</strong> ${property.propertyname}</li>
   <li><strong>Check-in Date:</strong> ${new Date(newBooking.startingDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</li>
<li><strong>Check-out Date:</strong> ${new Date(newBooking.endingDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</li>

          <li><strong>Rent Amount:</strong> $${newBooking.rentAmount}</li>
          <li><strong>Advance Amount:</strong> $${newBooking.advanceAmount}</li>
        </ul>
        
        <p style="font-size: 16px; line-height: 1.6;">We are looking forward to hosting you at <strong>${property.propertyname}</strong>. If you have any questions or need further assistance, feel free to contact us.</p>
      </div>

      <!-- Footer Section -->
      <div style="background-color: #f4f4f4; color: #777; text-align: center; padding: 15px;">
        <p style="margin: 0;">Best regards,</p>
        <p style="margin: 0;"><strong>The ${CompanyDetails.companyName} Team</strong></p>
        <p>${CompanyDetails.email}</p>
      </div>
    </div>
    `;

    return sendEmail(
      tenant?.email,
      "Your Booking Confirmation - Tenant Booking Details",
      bookingDetails,
      CompanyDetails.id
    );
  } catch (err) {
    console.error("Failed to send booking confirmation email:", err);
  }
};



const generateBookingId = () => {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const timestampPart = Date.now();
  const bookingId = `BK-${timestampPart}-${randomPart}`;
  return bookingId;
};

export const editBooking = async (req, res, next) => {
  const { id } = req.query;
  const booking = await bookingRepository.findOne({ where: { id } });
  const updatedBooking = booking
    ? await bookingRepository.save(Object.assign(booking, {
      accountName: req.body?.accountName,
      tenantId: req.body?.tenantId,
      propertyId: req.body?.propertyId,
      startingDate: req.body?.startingDate,
      endingDate: req.body?.endingDate,
      rentAmount: req.body?.rentAmount,
      advanceAmount: req.body?.advanceAmount,
      companyId: req.body?.companyId,
      projectId: req.body?.projectId,
      blockId: req.body?.blockId,
      createdBy: req.body?.createdBy,
    }))
    : null;
  if (!updatedBooking) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }
  return updatedBooking;
};

export const getBooking = async (req) => {
  const { id } = req.query;

  const AllBooking = await bookingRepository.find({
    where: { createdBy: id, isDeleted: false },
    relations: ["tenant", "owner", "property", "project", "block"],
    order: { createdAt: "DESC" },
  });

  if (!AllBooking) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  const finalResponse = [];
  for (const booking of AllBooking) {
    const createdBy = booking.createdBy;

    let creater = await agentRepository.findOne({ where: { id: createdBy } });
    let name;
    if (creater) {
      name = creater.agentName;
    } else {
      creater = await companyRepository.findOne({ where: { id: createdBy } });
      if (creater) {
        name = creater.companyName;
      }
    }
    finalResponse.push({ name, ...booking });
  }
  return finalResponse;
};

export const getBookingById = async (req) => {
  const { id } = req.query;
  const booking = await bookingRepository.findOne({
    where: { id },
    relations: ["tenant", "property", "company", "project", "block"],
  });

  if (!booking) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }
  return booking;
};

export const breakTheBooking = async (req) => {
  const { id } = req.query;

  const booking = await bookingRepository.findOne({ where: { id } });
  if (!booking) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }
  booking.isDeleted = true;
  await bookingRepository.save(booking);

  const tenant = await tenantRepository.findOne({ where: { id: booking.tenantId } });
  if (!tenant) {
    throw new CustomError(
      statusCodes?.notFound,
      "Tenant not found",
      errorCodes?.no_data_found
    );
  }

  tenant.isOccupied = false;
  await tenantRepository.save(tenant);

  const property = await propertyRepository.findOne({ where: { id: booking.propertyId } });
  if (!property) {
    throw new CustomError(
      statusCodes?.notFound,
      "Property not found",
      errorCodes?.no_data_found
    );
  }

  property.isVacant = true;
  await propertyRepository.save(property);

  return booking;
};

export const getAllBooking = async (req) => {
  const { id } = req.query;

  const allBooking = await bookingRepository.find({
    where: { companyId: id, isDeleted: false },
    relations: ["tenant", "property", "project", "block"],
    order: { createdAt: "DESC" },
  });

  if (!allBooking) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }

  const finalResponse = [];
  for (const booking of allBooking) {
    const createdBy = booking.createdBy;

    let creater = await agentRepository.findOne({ where: { id: createdBy } });
    let name;
    if (creater) {
      name = creater.agentName;
    } else {
      creater = await companyRepository.findOne({ where: { id: createdBy } });
      if (creater) {
        name = creater.companyName;
      }
    }
    finalResponse.push({ name, ...booking });
  }
  return finalResponse;
};

export const vacantPropertyOnNotice = async (req, res) => {
  const { id } = req.query;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const after15Days = new Date();
  after15Days.setDate(today.getDate() + 15);
  after15Days.setHours(23, 59, 59, 999);

  const bookings = await bookingRepository.find({
    where: {
      endingDate: Between(today, after15Days),
      companyId: id,
      isDeleted: false,
    },
    relations: ["property", "tenant", "company", "project", "block"],
  });

  return bookings;
};
