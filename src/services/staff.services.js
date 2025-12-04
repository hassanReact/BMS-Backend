import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import Booking from "../models/booking,model.js";
import Tenant from "../models/tenant.model.js";
import Company from "../models/company.model.js";
import { sendEmail } from "../core/helpers/mail.js";
import bcrypt from 'bcrypt';
import staff from "../models/staff.model.js";
import Complaint from "../models/complaints.model.js";

export const createStaff = async (req, res) => {
  const { staffName, email, password, phoneNo, address, companyId, designation, salary, cnic } = req.body;

  const [isCompanyAlreadyExist, isstaffAlreadyExist, isStudentAlreadyExist] =
    await Promise.all([
      Company.findOne({ email, isDeleted: false }),
      staff.findOne({ email, isDeleted: false }),
      Tenant.findOne({ email, isDeleted: false }),
    ]);

  if (isCompanyAlreadyExist || isstaffAlreadyExist || isStudentAlreadyExist) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }


  const newStaff = await staff.create({
    staffName,
    email,
    password,
    phoneNo,
    address,
    companyId: companyId,
    designation,
    Salary: salary,
    cnic
  });

  const CompanyDetails = await Company.findById(companyId);

  if (CompanyDetails.isMailStatus) {
    await sendStaffRegistrationEmail(newstaff, CompanyDetails);
  }
  if (CompanyDetails.whatappStatus) {
    await sendWhatsAppMessage(newstaff, CompanyDetails);
  }

  return newStaff
}

const sendWhatsAppMessage = async (tenant, CompanyDetails) => {
  try {

    const staffWhatsAppText = `
👋 Hey ${staff.staffName}!

Welcome to *${CompanyDetails.companyName}*! 🎉

Thanks for joining us as an *staff*. We're excited to have you on board.

📝 Your Registration Details:
• 👤 Name: ${staff.staffName}
• 📧 Email: ${staff.email}
• 📞 Phone: ${staff.phoneNo}
• 🏠 Address: ${staff.address}
• 🏢 Company: ${CompanyDetails.companyName}

If you have any questions, feel free to reach out to us at ${CompanyDetails.email}.

— The ${CompanyDetails.companyName} Team
`;


    return sendWhatsApp(
      tenant?.phoneno,
      staffWhatsAppText
    );
  } catch (err) {
    console.error("Failed to send tenant registration email:", err);
  }
};

const sendStaffRegistrationEmail = async (staff, CompanyDetails) => {
  try {
    // Email to staff
    const staffDetails = `
    <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333;">
      
      <!-- Header Section -->
      <div style="background-color: #4CAF50; color: white; padding: 15px; text-align: center;">
        <h2 style="margin: 0;">Welcome to ${CompanyDetails.companyName}, ${staff.staffName}!</h2>
      </div>

      <!-- Body Section -->
      <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #ddd; padding: 20px; box-sizing: border-box;">
        <p style="font-size: 16px; line-height: 1.6;">Dear ${staff.staffName},</p>
        <p style="font-size: 16px; line-height: 1.6;">Thank you for joining ${CompanyDetails.companyName} as an staff. We are excited to have you on board as our staff . Below are your registration details:</p>
        
        <ul style="font-size: 16px; line-height: 1.6;">
          <li><strong>staff Name:</strong> ${staff.staffName}</li>
          <li><strong>Email:</strong> ${staff.email}</li>
          <li><strong>Phone Number:</strong> ${staff.phoneNo}</li>
          <li><strong>Address:</strong> ${staff.address}</li>
          <li><strong>Company:</strong> ${CompanyDetails.companyName}</li>
        </ul>

        <p style="font-size: 16px; line-height: 1.6;">We look forward to a successful partnership with you. If you have any questions or need assistance, feel free to contact us.</p>
      </div>

      <!-- Footer Section -->
      <div style="background-color: #f4f4f4; color: #777; text-align: center; padding: 15px;">
        <p style="margin: 0;">Best regards,</p>
        <p style="margin: 0;"><strong>The ${CompanyDetails.companyName} Team</strong></p>
        <p>${CompanyDetails.email}</p>
      </div>
    </div>
    `;

    // Send the email to the staff
    return sendEmail(
      staff.email,
      "Welcome to Your New Role - staff Registration Details",
      staffDetails,
      CompanyDetails._id
    );
  } catch (err) {
    console.error("Failed to send staff registration email:", err);
  }
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const staff = await staff.findById(userId);
    const accessToken = staff.generateAccessToken();
    const refreshToken = staff.generateRefreshToken();

    staff.refreshToken = refreshToken;
    await staff.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new CustomError(
      statusCodes?.internalServerError,
      "Something went wrong while generating refresh and access tokens.",
      errorCodes?.server_error
    );
  }
};

export const loginStaff = async (req, res) => {
  const { email, password } = req.body;

  const staff = await staff.findOne({ email });

  if (!staff) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const passwordVerify = await staff.isPasswordCorrect(password);

  if (!passwordVerify) {
    throw new CustomError(
      statusCodes?.badRequest,
      Message?.inValid,
      errorCodes?.invalid_credentials
    );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    staff._id
  );

  const loginstaff = await staff.findById(staff._id).select(
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
    loginstaff,
  };
};

export const editStaff = async (req, res, next) => {
  const staffId = req.query.id;
  const updateData = req.body;
  const editstaff = await staff.findByIdAndUpdate(staffId, updateData, {
    new: true,
    runValidators: true,
  });
  if (!editstaff) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }
  return editstaff;
};

export const getAllStaff = async (req) => {
  const companyId = req.query.id;
  if (!companyId) {
    throw new CustomError(
      statusCodes.badRequest,
      Message.missingId,
      errorCodes.missing_id
    );
  }
  const allstaff = await staff.find({
    companyId: companyId,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  if (!allstaff) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.serverError,
      errorCodes?.conflict
    );
  }
  return allstaff;
};

export const deleteStaff = async (req, res) => {
  const staffId = req.params.id;

  const existingStaff = await staff.findById(staffId);
  if (!existingStaff) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }


  await staff.findByIdAndUpdate(staffId, { isDeleted: true });

  return existingStaff
}

export const getStaffById = async (req, res) => {
  const staffId = req.query.id;
  const staff = await staff.findById(staffId);

  if (!staff) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const bookings = await Booking.find({ createdBy: staffId })
    .populate("propertyId")
    .populate("tenantId");

  //   const formattedBookings = bookings.map((bookingData) => ({
  //     propertyName: bookingData.propertyId?.propertyname,
  //     description: bookingData.propertyId?.description,
  //     rent: bookingData.propertyId?.rent,
  //     address: bookingData.propertyId?.address
  // }));

  const tenant = await Tenant.find({ reporterId: staffId });

  return {
    staff,
    bookings,
    // booking: formattedBookings,
    tenant,
  };
};

export const changePassword = async (req) => {
  const { id, newPassword } = req.body;


  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const result = await staff.findByIdAndUpdate(id, {
    $set: {
      password: hashedPassword,
    },
  });
  return result;
};

export const getAllJobs = async (req) => {
  const assignedId = req.query.id;

  const allJobs = await Complaint.find({ assignedId, isDeleted: false })
    .populate("assignedId")
    .populate("tenantId")
    .populate("propertyId")
    .populate("companyId")
    .lean();

  if (!allJobs) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return allJobs;
}

export const changeStatusOfJob = async (req) => {
  const complaintId = req.query.id;
  const { status, staffId } = req.body;

  const Staff = await staff.findOne({ _id: staffId, isDeleted: false });

  if (!Staff) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    )
  }

  Staff.jobCompleted.push({
    complaintId,
    status,
  });

  Staff.save();

  return Staff;
} 