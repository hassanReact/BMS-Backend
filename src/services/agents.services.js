import Agent from "../models/agents.model.js";
import Property from "../models/property.model.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import Booking from "../models/booking,model.js";
import Tenant from "../models/tenant.model.js";
import Company from "../models/company.model.js";
import {sendEmail} from "../core/helpers/mail.js";
import bcrypt from 'bcrypt';
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import UserRole from "../models/userRole.model.js";

// export const createAgent = async (req, res) => {
//   const { agentName, email, password, phoneNo, address, companyId } = req.body;

//   const [isCompanyAlreadyExist, isAgentAlreadyExist, isStudentAlreadyExist] =
//     await Promise.all([
//       Company.findOne({ email, isDeleted: false }),
//       Agent.findOne({ email, isDeleted: false }),
//       Tenant.findOne({ email, isDeleted: false }),
//     ]);

//   if (isCompanyAlreadyExist || isAgentAlreadyExist || isStudentAlreadyExist) {
//     throw new CustomError(
//       statusCodes?.conflict,
//       Message?.alreadyExist,
//       errorCodes?.already_exist
//     );
//   }

//   // const isAgentAlreadyExist = await Agent.findOne({ email });
//   // if (isAgentAlreadyExist) {
//   //   throw new CustomError(
//   //     statusCodes?.conflict,
//   //     Message?.alreadyExist,
//   //     errorCodes?.already_exist,
//   //   );
//   // }

//   const newAgent = await Agent.create({
//     agentName,
//     email,
//     password,
//     phoneNo,
//     address,
//     companyId: companyId,
//   });

//     const CompanyDetails = await Company.findById(companyId);
  
//     if(CompanyDetails.isMailStatus){
//       await sendAgentRegistrationEmail(newAgent,CompanyDetails);
//     }
//     if(CompanyDetails.whatappStatus){
//       await sendWhatsAppMessage(newAgent, CompanyDetails);
//       }

//   return res.status(201).json({
//     success: true,
//     message: "Agent created successfully!",
//     data: newAgent,
//   });
// };


export const createAgent = async (req) => {
  const {
    agentName,
    email,
    password,
    phoneNo,
    address,
    companyId,
  } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  const session = await mongoose.startSession();

  try {
    let newAgent;

    await session.withTransaction(async () => {

      // 1. Find Agent role
      const agentRole = await Role.findOne({
        name: "Agent",
      }).session(session);

      if (!agentRole) {
        throw new CustomError(
          statusCodes?.notFound,
          "Agent role not found",
          errorCodes?.not_found
        );
      }

      // 2. Find existing User
      let user = await User.findOne({
        email: normalizedEmail,
        isDeleted: false,
      }).session(session);

      // 3. Create User if it doesn't exist
      if (!user) {
        const users = await User.create(
          [
            {
              fullname: agentName,
              email: normalizedEmail,
              password,
              phoneNo,
            },
          ],
          { session }
        );

        user = users[0];
      }

      // 4. Check Agent role for this company
      const existingUserRole = await UserRole.findOne({
        userId: user._id,
        roleId: agentRole._id,
        companyId,
      }).session(session);

      if (existingUserRole) {
        throw new CustomError(
          statusCodes?.conflict,
          Message?.alreadyExist,
          errorCodes?.already_exist
        );
      }

      // 5. Assign Agent role
      await UserRole.create(
        [
          {
            userId: user._id,
            roleId: agentRole._id,
            companyId,
          },
        ],
        { session }
      );

      // 6. Create Agent profile
      const agents = await Agent.create(
        [
          {
            userId: user._id,
            agentName,
            email: normalizedEmail,
            phoneNo,
            address,
            companyId,
          },
        ],
        { session }
      );

      newAgent = agents[0];
    });

    // Transaction committed successfully

    const companyDetails = await Company.findById(companyId);

    if (companyDetails?.isMailStatus) {
      await sendAgentRegistrationEmail(
        newAgent,
        companyDetails
      );
    }

    if (companyDetails?.whatappStatus) {
      await sendWhatsAppMessage(
        newAgent,
        companyDetails
      );
    }

    return newAgent;

  } finally {
    await session.endSession();
  }
};

const sendWhatsAppMessage = async (tenant, CompanyDetails) => {
  try {
   
    const agentWhatsAppText = `
👋 Hey ${agent.agentName}!

Welcome to *${CompanyDetails.companyName}*! 🎉

Thanks for joining us as an *Agent*. We're excited to have you on board.

📝 Your Registration Details:
• 👤 Name: ${agent.agentName}
• 📧 Email: ${agent.email}
• 📞 Phone: ${agent.phoneNo}
• 🏠 Address: ${agent.address}
• 🏢 Company: ${CompanyDetails.companyName}

If you have any questions, feel free to reach out to us at ${CompanyDetails.email}.

— The ${CompanyDetails.companyName} Team
`;

    
    return sendWhatsApp(
      tenant?.phoneno,
      agentWhatsAppText
    );
  } catch (err) {
    console.error("Failed to send tenant registration email:", err);
  }
};

const sendAgentRegistrationEmail = async (agent, CompanyDetails) => {
  try {
    // Email to Agent
    const agentDetails = `
    <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333;">
      
      <!-- Header Section -->
      <div style="background-color: #4CAF50; color: white; padding: 15px; text-align: center;">
        <h2 style="margin: 0;">Welcome to ${CompanyDetails.companyName}, ${agent.agentName}!</h2>
      </div>

      <!-- Body Section -->
      <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #ddd; padding: 20px; box-sizing: border-box;">
        <p style="font-size: 16px; line-height: 1.6;">Dear ${agent.agentName},</p>
        <p style="font-size: 16px; line-height: 1.6;">Thank you for joining ${CompanyDetails.companyName} as an agent. We are excited to have you on board as our Agent . Below are your registration details:</p>
        
        <ul style="font-size: 16px; line-height: 1.6;">
          <li><strong>Agent Name:</strong> ${agent.agentName}</li>
          <li><strong>Email:</strong> ${agent.email}</li>
          <li><strong>Phone Number:</strong> ${agent.phoneNo}</li>
          <li><strong>Address:</strong> ${agent.address}</li>
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

    // Send the email to the agent
    return sendEmail(
      agent.email,
      "Welcome to Your New Role - Agent Registration Details",
      agentDetails,
      CompanyDetails._id
    );
  } catch (err) {
    console.error("Failed to send agent registration email:", err);
  }
};



const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const agent = await Agent.findById(userId);
    const accessToken = agent.generateAccessToken();
    const refreshToken = agent.generateRefreshToken();

    agent.refreshToken = refreshToken;
    await agent.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new CustomError(
      statusCodes?.internalServerError,
      "Something went wrong while generating refresh and access tokens.",
      errorCodes?.server_error
    );
  }
};

export const loginAgent = async (req, res) => {
  const { email, password } = req.body;

  const agent = await Agent.findOne({ email });

  if (!agent) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const passwordVerify = await agent.isPasswordCorrect(password);

  if (!passwordVerify) {
    throw new CustomError(
      statusCodes?.badRequest,
      Message?.inValid,
      errorCodes?.invalid_credentials
    );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    agent._id
  );

  const loginAgent = await Agent.findById(agent._id).select(
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
    loginAgent,
  };
};

export const editAgent = async (req, res, next) => {
  const agentId = req.query.id;
  const updateData = req.body;
  const editAgent = await Agent.findByIdAndUpdate(agentId, updateData, {
    new: true,
    runValidators: true,
  });
  if (!editAgent) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }
  return editAgent;
};

export const getAllAgent = async (req) => {
  const companyId = req.query.id;
  if (!companyId) {
    throw new CustomError(
      statusCodes.badRequest,
      Message.missingId,
      errorCodes.missing_id
    );
  }
  const allAgent = await Agent.find({
    companyId: companyId,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  if (!allAgent) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.serverError,
      errorCodes?.conflict
    );
  }
  return allAgent;
};

export const deleteAgent = async (req, res) => {
  const agentId = req.query.id;

  const agent = await Agent.findById(agentId);
  if (!agent) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }

  agent.isDeleted = true;
  await agent.save();

  return agent;
};

export const getAgentById = async (req, res) => {
  const agentId = req.query.id;
  const agent = await Agent.findById(agentId);

  if (!agent) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }

  const bookings = await Booking.find({ createdBy: agentId })
    .populate("propertyId")
    .populate("tenantId");

  //   const formattedBookings = bookings.map((bookingData) => ({
  //     propertyName: bookingData.propertyId?.propertyname,
  //     description: bookingData.propertyId?.description,
  //     rent: bookingData.propertyId?.rent,
  //     address: bookingData.propertyId?.address
  // }));

  const tenant = await Tenant.find({ reporterId: agentId });

  return {
    agent,
    bookings,
    // booking: formattedBookings,
    tenant,
  };
};

export const changePassword = async (req) => {
  const { id, newPassword } = req.body;

  


  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const result = await Agent.findByIdAndUpdate(id, {
    $set: {
      password: hashedPassword,
    },
  });
  
  return result;
};
