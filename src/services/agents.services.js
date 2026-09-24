import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import {sendEmail} from "../core/helpers/mail.js";
import AppDataSource from "../core/database/data-source.js";
import { hashPassword, comparePassword } from "./user.services.js";
import jwt from "jsonwebtoken";

const getRepository = (entityName) => AppDataSource.getRepository(entityName);

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

  let newAgent;

  await AppDataSource.transaction(async (transactionalEntityManager) => {
    const roleRepository = transactionalEntityManager.getRepository("Role");
    const userRepository = transactionalEntityManager.getRepository("User");
    const userRoleRepository = transactionalEntityManager.getRepository("UserRole");
    const agentRepository = transactionalEntityManager.getRepository("Agent");

      // 1. Find Agent role
      const agentRole = await roleRepository.findOne({ where: { name: "Agent" } });

      if (!agentRole) {
        throw new CustomError(
          statusCodes?.notFound,
          "Agent role not found",
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
          fullname: agentName,
          email: normalizedEmail,
          password: await hashPassword(password),
          phoneNo,
        });
        await userRepository.save(user);
      }


      // 5. Assign Agent role
      const userRole = userRoleRepository.create({
        userId: user.id,
        roleId: agentRole.id,
        companyId,
      });
      await userRoleRepository.save(userRole);

      // 6. Create Agent profile
      newAgent = agentRepository.create({
        userId: user.id,
        agentName,
        email: normalizedEmail,
        phoneNo,
        address,
        companyId,
      });
      await agentRepository.save(newAgent);
  });

    // Transaction committed successfully

    const companyDetails = await getRepository("Company").findOne({ where: { id: companyId } });

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

};

const sendWhatsAppMessage = async (tenant, CompanyDetails) => {
  try {
   
    const agentWhatsAppText = `
👋 Hey ${tenant.agentName}!

Welcome to *${CompanyDetails.companyName}*! 🎉

Thanks for joining us as an *Agent*. We're excited to have you on board.

📝 Your Registration Details:
• 👤 Name: ${tenant.agentName}
• 📧 Email: ${tenant.email}
• 📞 Phone: ${tenant.phoneNo}
• 🏠 Address: ${tenant.address}
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
      CompanyDetails.id
    );
  } catch (err) {
    console.error("Failed to send agent registration email:", err);
  }
};



const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const agent = await getRepository("Agent").findOne({ where: { id: userId } });
    const user = agent
      ? await getRepository("User").findOne({ where: { id: agent.userId } })
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

export const loginAgent = async (req, res) => {
  const { email, password } = req.body;

  const agent = await getRepository("Agent").findOne({ where: { email } });

  if (!agent) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const user = await getRepository("User").findOne({ where: { id: agent.userId } });
  const passwordVerify = await comparePassword(password, user.password);

  if (!passwordVerify) {
    throw new CustomError(
      statusCodes?.badRequest,
      Message?.inValid,
      errorCodes?.invalid_credentials
    );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    agent.id
  );

  const loginAgent = await getRepository("Agent").findOne({ where: { id: agent.id } });

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
  const agentRepository = getRepository("Agent");
  const existingAgent = await agentRepository.findOne({ where: { id: agentId } });
  const editAgent = existingAgent ? await agentRepository.save(Object.assign(existingAgent, updateData)) : null;
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
  const allAgent = await getRepository("Agent").find({
    where: { companyId, isDeleted: "false" },
    order: { createdAt: "DESC" },
  });

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

  const agent = await getRepository("Agent").findOne({ where: { id: agentId } });
  if (!agent) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }

  agent.isDeleted = "true";
  await getRepository("Agent").save(agent);

  return agent;
};

export const getAgentById = async (req, res) => {
  const agentId = req.query.id;
  const agent = await getRepository("Agent").findOne({ where: { id: agentId } });

  if (!agent) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }

  const bookings = await getRepository("Booking").find({
    where: { createdBy: agentId },
    relations: { property: true, tenant: true },
  });

  //   const formattedBookings = bookings.map((bookingData) => ({
  //     propertyName: bookingData.propertyId?.propertyname,
  //     description: bookingData.propertyId?.description,
  //     rent: bookingData.propertyId?.rent,
  //     address: bookingData.propertyId?.address
  // }));

  const tenant = await getRepository("Tenant").find({ where: { reporterId: agentId } });

  return {
    agent,
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
  const agent = await getRepository("Agent").findOne({ where: { id } });
  const user = agent ? await getRepository("User").findOne({ where: { id: agent.userId } }) : null;
  const result = user ? await getRepository("User").save(Object.assign(user, { password: hashedPassword })) : null;
  
  return result;
};
