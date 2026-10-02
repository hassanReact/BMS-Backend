// import Owner from "../models/owner.model.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import { commentAndResolved } from "../controllers/company.controller.js";
import AppDataSource from "../core/database/data-source.js";
import { hashPassword, comparePassword } from "./user.services.js";
import jwt from "jsonwebtoken";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginRateLimit,
} from "../utils/redis/loginRateLimit.js";
import redisClient from "../core/database/redis.js";

function getRepository(entityName) {
  return AppDataSource.getRepository(entityName);
}


export const companyRegistration = async (req) => {
  const {
    companyName,
    email,
    password,
    phoneNo,
    address,
    currencyCode,
    gstnumber,
  } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  let createdCompany;

  await AppDataSource.transaction(async (transactionalEntityManager) => {
    const roleRepository = transactionalEntityManager.getRepository("Role");
    const userRepository = transactionalEntityManager.getRepository("User");
    const companyRepository = transactionalEntityManager.getRepository("Company");
    const userRoleRepository = transactionalEntityManager.getRepository("UserRole");

      // 1. Find CompanyAdmin role
      const companyAdminRole = await roleRepository.findOne({
        where: { name: "CompanyAdmin" },
      });

      if (!companyAdminRole) {
        throw new CustomError(
          statusCodes?.notFound,
          "CompanyAdmin role not found",
          errorCodes?.not_found
        );
      }

      // 2. Check if email already exists
      const existingUser = await userRepository.findOne({
        where: { email: normalizedEmail, isDeleted: false },
      });

      if (existingUser) {
        throw new CustomError(
          statusCodes?.conflict,
          Message?.alreadyExist,
          errorCodes?.already_exist
        );
      }

      // 3. Create User first
      const user = userRepository.create({
        fullname: companyName,
        email: normalizedEmail,
        password: await hashPassword(password),
        phoneNo,
      });
      await userRepository.save(user);

      // 4. Create Company with userId
      createdCompany = companyRepository.create({
        userId: user.id,
        companyName,
        email: normalizedEmail,
        password: await hashPassword(password),
        phoneNo,
        address,
        currencyCode,
        gstnumber,
      });
      await companyRepository.save(createdCompany);

      // 5. Create UserRole
      const userRole = userRoleRepository.create({
        userId: user.id,
        roleId: companyAdminRole.id,
        companyId: createdCompany.id,
      });
      await userRoleRepository.save(userRole);
  });

  const resultRecord = await getRepository("Company").findOne({
    where: { id: createdCompany.id },
  });
  const result = resultRecord
    ? Object.fromEntries(
        Object.entries(resultRecord).filter(
          ([field]) => field !== "password" && field !== "refreshToken"
        )
      )
    : null;

  if (!result) {
    throw new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }

  return result;
};

export const addSMTPMailPassword = async (req) => {
  const { id, smtpMail, smtpCode } = req.body;

  if (!id) {
    throw new CustomError(
      statusCodes.badRequest,
      "Invalid Company ID",
      errorCodes.invalid_request
    );
  }

  const companyRepository = getRepository("Company");
  const company = await companyRepository.findOne({ where: { id } });
  const companyMailSMTP = company
    ? await companyRepository.save(Object.assign(company, { smtpMail, smtpCode }))
    : null;

  if (!companyMailSMTP) {
    throw new CustomError(
      statusCodes.notFound,
      Message.notFound,
      errorCodes.not_found
    );
  }

  return companyMailSMTP;
};

export const findSmtpDetails = async (CompanyId) => {
  const companyDetails = await getRepository("Company").findOne({
    where: { id: CompanyId },
  });
  if (!companyDetails) {
    return false;
  }

  const smtp = {
    key: companyDetails?.smtpCode,
    mail: companyDetails?.smtpMail,
  };

  return smtp;
};

export const changePassword = async (req) => {
  const { id, newPassword } = req.body;

  const hashedPassword = await hashPassword(newPassword);

  const companyRepository = getRepository("Company");
  const company = await companyRepository.findOne({ where: { id } });
  const result = company
    ? await companyRepository.save(Object.assign(company, { password: hashedPassword }))
    : null;
  return result;
};
export const universalLogin = async (req) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new CustomError(
      statusCodes?.badRequest,
      "Email and password are required",
      errorCodes?.invalid_credentials
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  const rateLimit = await checkLoginRateLimit({
  ip: req.ip,
  email: normalizedEmail,
});

if (!rateLimit.allowed) {
  throw new CustomError(
    statusCodes?.tooManyRequests || 429,
    "Too many login attempts. Please try again later.",
    errorCodes?.too_many_requests
  );
}

  // 1. Find authentication account
  const userRepository = getRepository("User");
  const userRoleRepository = getRepository("UserRole");
  const user = await userRepository.findOne({
    where: { email: normalizedEmail, isDeleted: false },
  });

if (!user) {
  await recordFailedLogin({
    ip: req.ip,
    email: normalizedEmail,
  });

  throw new CustomError(
    statusCodes?.notFound,
    "No account found with this email address.",
    errorCodes?.not_found
  );
}

  // 2. Check password
  const passwordCorrect = await comparePassword(password, user.password);

if (!passwordCorrect) {
  await recordFailedLogin({
    ip: req.ip,
    email: normalizedEmail,
  });

  throw new CustomError(
    statusCodes?.badRequest,
    Message?.inValid,
    errorCodes?.invalid_credentials
  );
}

await resetLoginRateLimit({
  ip: req.ip,
  email: normalizedEmail,
});

  // 3. Find all active roles of this user
  const userRoles = await userRoleRepository.findOne({
    where: { userId: user.id, status: "active" },
    relations: { role: true, company: true },
  });

    if (!userRoles){
    throw new CustomError(
      statusCodes?.forbidden,
      "No active roles found for this user. Please contact administrator.",
      errorCodes?.unauthorized
    );
  }

  // 5. Generate tokens
  const payload = {
  userId: user.id,
    email: user.email,
   role: userRoles.role.name,
   roleId: userRoles.role.id,
   companyId: userRoles.company?.id || null,
  };

  const accessToken = jwt.sign(
    payload,
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );

  // 6. Save refresh token
  user.refreshToken = refreshToken;
  await userRepository.save(user);

  const options = {
    httpOnly: true,
    secure: false, // true in production
    sameSite: "strict",
  };

  return {
    requiresRoleSelection: false,

    user: {
      _id: user.id,
      fullname: user.fullname,
      email: user.email,
    },

    role: userRoles.role.name,
    roleId: userRoles.role.id,
    companyId: userRoles.company?.id || null,

    accessToken,
    refreshToken,
    options,
  };
};


const generateAccessAndRefreshTokens = async (
  user,
  userRole
) => {

  const payload = {
    userId: user.id,
    email: user.email,
    roleId: userRole.role.id,
    role: userRole.role.name,
    companyId: userRole.company?.id || null,
  };

  const accessToken = jwt.sign(
    payload,
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );

  user.refreshToken = refreshToken;
  await getRepository("User").save(user);

  return {
    accessToken,
    refreshToken,
  };
};
export const getAllCompany = async (req) => {
  const AllComp = await getRepository("Company").find({
    where: { isDeleted: false },
    order: { createdAt: "DESC" },
  });

  if (!AllComp) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  return AllComp;
};

export const totalActiveCompany = async (req) => {
  const AllComp = await getRepository("Company").find({
    where: { isDeleted: false, status: true },
    order: { createdAt: "DESC" },
  });

  if (!AllComp) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  return AllComp;
};

export const companySubscriptionDetails = async (req) => {
  const companies = await getRepository("Company").find({
    where: { isDeleted: false },
    relations: { subscription: true },
  });
  const AllComp = companies.map(({ subscription, ...company }) => ({
    ...company,
    subcriptionId: subscription || company.subcriptionId,
  }));

  if (!AllComp) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  return AllComp;
};

export const getCompanyById = async (req) => {
  const companyId = req.query.id;
  const companyDetails = await getRepository("Company").findOne({
    where: { id: companyId },
  });

  if (!companyDetails) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return companyDetails;
};

export const editCompany = async (req, res, next) => {
  const CompanyId = req.query.id;
  const updateData = req.body;
  const companyRepository = getRepository("Company");
  const company = await companyRepository.findOne({ where: { id: CompanyId } });
  const editCompany = company
    ? await companyRepository.save(Object.assign(company, updateData))
    : null;
  if (!updateData) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }
  return editCompany;
};

export const deleteCompany = async (req, res) => {
  const companyId = req.query.id;

  const companyRepository = getRepository("Company");
  const company = await companyRepository.findOne({ where: { id: companyId } });
  if (!company) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  company.isDeleted = true;
  await companyRepository.save(company);

  return company;
};

export const changestatus = async (req, res) => {
  const companyId = req.query.id;

  const companyRepository = getRepository("Company");
  const staffRepository = getRepository("Staff");
  const tenantRepository = getRepository("Tenant");
  const company = await companyRepository.findOne({ where: { id: companyId } });

  if (!company) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const newCompanyStatus = !company.status;
  company.status = newCompanyStatus;
  await companyRepository.save(company);

  await staffRepository.update({ companyId }, { status: newCompanyStatus });

  await tenantRepository.update({ companyId }, { status: newCompanyStatus });

  return company;
};

export const updateMailStatus = async (req, res) => {
  const companyId = req.body.id || req.body.companyId;

  const companyRepository = getRepository("Company");
  const company = await companyRepository.findOne({ where: { id: companyId } });

  if (!company) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const newStatus = !company.isMailStatus;
  company.isMailStatus = newStatus;
  await companyRepository.save(company);

  return company;
};

export const updateWhataapStatus = async (req, res) => {
  const companyId = req.body.id || req.body.companyId;

  const companyRepository = getRepository("Company");
  const company = await companyRepository.findOne({ where: { id: companyId } });

  if (!company) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const newStatus = !company.whatappStatus;
  company.whatappStatus = newStatus;
  await companyRepository.save(company);

  return company;
};

export const addSubcriptionPlan = async (req, res) => {
  const { companyId, SubscriptionId, buyDate } = req.body;
  const companyRepository = getRepository("Company");
  const company = await companyRepository.findOne({ where: { id: companyId } });

  if (!company) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }
  company.subcriptionId = SubscriptionId;
  company.subcriptionBuyDate = buyDate;
  await companyRepository.save(company);

  return company;
};
export const getTotalData = async (req) => {
  const cacheKey = "bms:company:total-data";

  // 1. Check Redis
  const cachedData = await redisClient.get(cacheKey);

  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // 2. Redis miss → PostgreSQL
  const company = await getRepository("Company").find({
    where: { isDeleted: false },
  });

  const tenant = await getRepository("Tenant").find({
    where: { isDeleted: false },
  });

  const agent = await getRepository("Staff").find({
    where: { isDeleted: false },
  });

  const properties = await getRepository("Property").find({
    where: { isDeleted: false },
  });

  const subscriptionPlan = await getRepository("Subscription").find();

  const activeCompany = await getRepository("Company").find({
    where: { isDeleted: false, status: true },
  });

  const formattedData = [
    company.length,
    tenant.length,
    agent.length,
    properties.length,
    subscriptionPlan.length,
    activeCompany.length,
  ];

  // 3. Store result for 5 minutes
  await redisClient.setEx(
    cacheKey,
    5 * 60,
    JSON.stringify(formattedData)
  );

  // 4. Return same result
  return formattedData;
};
