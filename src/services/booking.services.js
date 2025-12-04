// import Agent from "../models/agents.model.js";
import Booking from "../models/booking,model.js";
import Property from "../models/property.model.js";
import {
  errorCodes,
  bookingPrefix,
  Message,
  statusCodes,
} from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import Agent from "../models/agents.model.js";
import Company from "../models/company.model.js";
import Tenant from "../models/tenant.model.js";
import {sendEmail} from "../core/helpers/mail.js"
import Bill from "../models/billing.model.js";

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

  const newBooking = await Booking.create({
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
  const property = await Property.findById(propertyId);
  property.isVacant = false;
  await property.save();

  const tenant = await Tenant.findById(tenantId);
  tenant.isOccupied = true;
  await tenant.save();

  
  const CompanyDetails = await Company.findById(companyId);
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

      <!-- Body Section -->
      <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #ddd; padding: 20px; box-sizing: border-box;">
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
      CompanyDetails._id
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
  const updatedBooking = await Booking.findByIdAndUpdate(
    id,
    {
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
    },
    {
      new: true,
    }
  );
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

  const AllBooking = await Booking.find({ createdBy: id, isDeleted: false })
    .populate("tenantId", "tenantName")
    .populate("ownerId", "ownerName")
    .populate("propertyId", "propertyname")
    .populate("projectId", "projectName")
    .populate("blockId", "blockName")
    .sort({ createdAt: -1 })
    .lean();

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

export const getBookingById = async (req) => {
  const { id } = req.query;
  const booking = await Booking.findById(id)
    .populate("tenantId")
    .populate("propertyId")
    .populate("companyId")
    .populate("projectId")
    .populate("blockId")
    .sort({ createdAt: -1 })
    .lean();

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

  const booking = await Booking.findById(id);
  if (!booking) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.no_data_found
    );
  }
  booking.isDeleted = true;
  booking.save();

  const tenant = await Tenant.findById(booking.tenantId);
  if (!tenant) {
    throw new CustomError(
      statusCodes?.notFound,
      "Tenant not found",
      errorCodes?.no_data_found
    );
  }

  tenant.isOccupied = false;
  await tenant.save();

  const property = await Property.findById(booking.propertyId);
  if (!property) {
    throw new CustomError(
      statusCodes?.notFound,
      "Property not found",
      errorCodes?.no_data_found
    );
  }

  property.isVacant = true;
  await property.save();

  return booking;
};

export const getAllBooking = async (req) => {
  const { id } = req.query;

  const allBooking = await Booking.find({ companyId: id, isDeleted: false })
    .populate("tenantId")
    .populate("propertyId")
    .populate("projectId")
    .populate("blockId")
    .sort({ createdAt: -1 })
    .lean();

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

export const vacantPropertyOnNotice = async (req, res) => {
  const { id } = req.query;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const after15Days = new Date();
  after15Days.setDate(today.getDate() + 15);
  after15Days.setHours(23, 59, 59, 999);

  const bookings = await Booking.find({
    endingDate: {
      $gte: today,
      $lte: after15Days,
    },
    companyId: id,
    isDeleted: false,
  }).populate("propertyId tenantId companyId projectId blockId");

  return bookings;
};
