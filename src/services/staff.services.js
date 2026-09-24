import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import { sendEmail } from "../core/helpers/mail.js";
import AppDataSource from "../core/database/data-source.js";
import { hashPassword, comparePassword } from "./user.services.js";
import jwt from "jsonwebtoken";

const getRepository = (entityName) => AppDataSource.getRepository(entityName);


export const createStaff = async (req) => {
  const {
    staffName,
    email,
    password,
    phoneNo,
    address,
    companyId,
    designation,
    salary,
    cnic,
  } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  let newStaff;

  await AppDataSource.transaction(async (transactionalEntityManager) => {
    const roleRepository = transactionalEntityManager.getRepository("Role");
    const userRepository = transactionalEntityManager.getRepository("User");
    const userRoleRepository = transactionalEntityManager.getRepository("UserRole");
    const staffRepository = transactionalEntityManager.getRepository("Staff");

      // 1. Find Staff role
      const staffRole = await roleRepository.findOne({ where: { name: "Staff" } });

      if (!staffRole) {
        throw new CustomError(
          statusCodes?.notFound,
          "Staff role not found",
          errorCodes?.not_found
        );
      }

      // 2. Find existing User
      let user = await userRepository.findOne({
        where: { email: normalizedEmail, isDeleted: false },
      });

      if(user){
        throw new CustomError(
          statusCodes?.conflict,
          Message?.alreadyExist,
          errorCodes?.already_exist
        );
      }

      // 3. Create User if it doesn't exist
      if (!user) {
        user = userRepository.create({
          fullname: staffName,
          email: normalizedEmail,
          password: await hashPassword(password),
          phoneNo,
        });
        await userRepository.save(user);
      }

      // 5. Create UserRole
      const userRole = userRoleRepository.create({
        userId: user.id,
        roleId: staffRole.id,
        companyId,
      });
      await userRoleRepository.save(userRole);

      // 6. Create Staff profile
      newStaff = staffRepository.create({
        userId: user.id,
        staffName,
        email: normalizedEmail,
        phoneNo,
        address,
        companyId,
        designation,
        Salary: salary,
        cnic,
      });
      await staffRepository.save(newStaff);
  });

    // Transaction successfully committed.
    // External services happen AFTER commit.

    const companyDetails = await getRepository("Company").findOne({ where: { id: companyId } });

    if (
      companyDetails?.isMailStatus
    ) {
      await sendStaffRegistrationEmail(
        newStaff,
        companyDetails
      );
    }

    if (
      companyDetails?.whatappStatus
    ) {
      await sendWhatsAppMessage(
        newStaff,
        companyDetails
      );
    }

    return newStaff;

};


const sendWhatsAppMessage = async (tenant, CompanyDetails) => {
  try {

    const staffWhatsAppText = `
👋 Hey ${tenant.staffName}!

Welcome to *${CompanyDetails.companyName}*! 🎉

Thanks for joining us as an *staff*. We're excited to have you on board.

📝 Your Registration Details:
• 👤 Name: ${tenant.staffName}
• 📧 Email: ${tenant.email}
• 📞 Phone: ${tenant.phoneNo}
• 🏠 Address: ${tenant.address}
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
      CompanyDetails.id
    );
  } catch (err) {
    console.error("Failed to send staff registration email:", err);
  }
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const staffUser = await getRepository("Staff").findOne({ where: { id: userId } });
    const user = staffUser
      ? await getRepository("User").findOne({ where: { id: staffUser.userId } })
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
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY });

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


//contain errors
export const loginStaff = async (req, res) => {
  const { email, password } = req.body;

  const staffUser = await getRepository("Staff").findOne({ where: { email } });

  if (!staffUser) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const user = await getRepository("User").findOne({ where: { id: staffUser.userId } });
  const passwordVerify = await comparePassword(password, user.password);

  if (!passwordVerify) {
    throw new CustomError(
      statusCodes?.badRequest,
      Message?.inValid,
      errorCodes?.invalid_credentials
    );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    staffUser.id
  );

  const loginstaff = await getRepository("Staff").findOne({ where: { id: staffUser.id } });

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
  const staffRepository = getRepository("Staff");
  const existingStaff = await staffRepository.findOne({ where: { id: staffId } });
  const editstaff = existingStaff ? await staffRepository.save(Object.assign(existingStaff, updateData)) : null;
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

  const company = await getRepository("Company").findOne({ where: { id: companyId } });

  if(!company || company.isDeleted){
     
    throw new CustomError(
       statusCodes.notFound,
      Message.notFound,
      errorCodes.not_found
    );
    }


  const allstaff = await getRepository("Staff").find({
    where: { companyId, isDeleted: false },
    order: { createdAt: "DESC" },
  });

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

  const existingStaff = await getRepository("Staff").findOne({ where: { id: staffId } });
  if (!existingStaff) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }


  await getRepository("Staff").update(staffId, { isDeleted: true });

  return existingStaff
}

export const getStaffById = async (req, res) => {
  const staffId = req.query.id;
  const Staff = await getRepository("Staff").findOne({ where: { id: staffId } });

  if (!Staff) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const bookings = await getRepository("Booking").find({
    where: { createdBy: staffId },
    relations: { property: true, tenant: true },
  });

  //   const formattedBookings = bookings.map((bookingData) => ({
  //     propertyName: bookingData.propertyId?.propertyname,
  //     description: bookingData.propertyId?.description,
  //     rent: bookingData.propertyId?.rent,
  //     address: bookingData.propertyId?.address
  // }));

  const tenant = await getRepository("Tenant").find({ where: { reporterId: staffId } });

  return {
    Staff,
    bookings: bookings.map((booking) => {
      const { property, tenant, ...bookingData } = booking;
      return { ...bookingData, propertyId: property, tenantId: tenant };
    }),
    // booking: formattedBookings,
    tenant,
  };
};

export const changePassword = async (req) => {
  const { id, newPassword } = req.body;


  const hashedPassword = await hashPassword(newPassword);
  const staffUser = await getRepository("Staff").findOne({ where: { id } });
  const user = staffUser ? await getRepository("User").findOne({ where: { id: staffUser.userId } }) : null;
  const result = user ? await getRepository("User").save(Object.assign(user, { password: hashedPassword })) : null;
  return result;
};

export const getAllJobs = async (req) => {
  const assignedId = req.query.id;

  const allJobs = await getRepository("Complaint").find({
    where: { assignedId, isDeleted: false },
    relations: { assignedStaff: true, tenant: true, property: true, company: true },
  });

  if (!allJobs) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return allJobs.map((job) => {
    const { assignedStaff, tenant, property, company, ...jobData } = job;
    return {
      ...jobData,
      assignedId: assignedStaff,
      tenantId: tenant,
      propertyId: property,
      companyId: company,
    };
  });
}

export const changeStatusOfJob = async (req) => {
  const complaintId = req.query.id;
  const { status, staffId } = req.body;

  const Staff = await getRepository("Staff").findOne({ where: { id: staffId, isDeleted: false } });

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

  await getRepository("Staff").save(Staff);

  return Staff;
} 