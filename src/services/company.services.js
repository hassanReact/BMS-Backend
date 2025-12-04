// import Owner from "../models/owner.model.js";
import Company from "../models/company.model.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import Agent from "../models/staff.model.js";
import Tenant from "../models/tenant.model.js";
import Complaint from "../models/complaints.model.js";
import Property from "../models/property.model.js";
import Subscription from "../models/subscription.model.js";
import { commentAndResolved } from "../controllers/company.controller.js";
import bcrypt from "bcrypt";
import Owner from "../models/owner.model.js";

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
  // const isCompanyAlreadyExist = await Company.findOne({ email });

  const [isCompanyAlreadyExist, isAgentAlreadyExist, isTenantAlreadyExist] =
    await Promise.all([
      Company.findOne({ email, isDeleted: false }),
      Agent.findOne({ email, isDeleted: false }),
      Tenant.findOne({ email, isDeleted: false }),
    ]);

  if (isCompanyAlreadyExist || isAgentAlreadyExist || isTenantAlreadyExist) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  const company = await Company.create({
    companyName,
    email,
    password,
    phoneNo,
    address,
    currencyCode,
    gstnumber,
  });

  const createdCompany = await Company.findById(company._id).select(
    "-password -refreshToken"
  );

  if (!createdCompany) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }
  return createdCompany;
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

  const companyMailSMTP = await Company.findByIdAndUpdate(
    id,
    { smtpMail, smtpCode },
    { new: true, runValidators: true }
  );

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
  const companyDetails = await Company.findOne({ _id: CompanyId });
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

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const result = await Company.findByIdAndUpdate(id, {
    $set: {
      password: hashedPassword,
    },
  });
  return result;
};

// export const companyLogin = async (req, res) => {
//   const { email, password } = req.body;

//   const company = await Company.findOne({ email });
//   if (!company) {
//     throw new CustomError(
//       statusCodes?.notFound,
//       Message?.notFound,
//       errorCodes?.not_found
//     );
//   }

//   const passwordVerify = await company.isPasswordCorrect(password);

//   if (!passwordVerify) {
//     throw new CustomError(
//       statusCodes?.badRequest,
//       Message?.inValid,
//       errorCodes?.invalid_credentials
//     );
//   }

//   const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
//     company._id
//   );

//   const loginCompany = await Company.findById(company._id).select(
//     "-password -refreshToken"
//   );

//   res.setHeader("token", accessToken);

//   const options = {
//     httpOnly: true,
//     secure: true,
//   };

//   return {
//     company,
//     role: company.role,
//     accessToken,
//     refreshToken,
//     options,
//     loginCompany
//   };
// };

export const universalLogin = async (req, res) => {
  const { email, password } = req.body;

  console.log("🔐 Login attempt for email:", email);

  let user = null;

  // Check each user type
  const company = await Company.findOne({
    email,
    isDeleted: false,
    status: true,
  });
  const agent = await Agent.findOne({ email, isDeleted: false, status: true });

  const tenant = await Tenant.findOne({
    email,
    isDeleted: false,
    status: true,
  });

  const owner = await Owner.findOne({ email, isDeleted: false });

  // Check if user exists but doesn't meet login criteria
  const inactiveCompany = await Company.findOne({ email, isDeleted: false, status: false });
  const deletedCompany = await Company.findOne({ email, isDeleted: true });
  const inactiveAgent = await Agent.findOne({ email, isDeleted: false, status: false });
  const deletedAgent = await Agent.findOne({ email, isDeleted: true });
  const inactiveTenant = await Tenant.findOne({ email, isDeleted: false, status: false });
  const deletedTenant = await Tenant.findOne({ email, isDeleted: true });
  const deletedOwner = await Owner.findOne({ email, isDeleted: true });

  console.log("🔍 Search results:", {
    activeCompany: !!company,
    activeAgent: !!agent,
    activeTenant: !!tenant,
    activeOwner: !!owner,
    inactiveCompany: !!inactiveCompany,
    inactiveAgent: !!inactiveAgent,
    inactiveTenant: !!inactiveTenant,
    deletedCompany: !!deletedCompany,
    deletedAgent: !!deletedAgent,
    deletedTenant: !!deletedTenant,
    deletedOwner: !!deletedOwner
  });

  if (company) {
    console.log("company")
    user = company;
  } else if (agent) {
    console.log("agent")
    user = agent;
  } else if (owner) {
    console.log("owner")
    user = owner;
  } else if (tenant) {
    console.log("tenant")
    user = tenant;
  }

  if (!user) {
    // Provide specific error messages based on what we found
    if (inactiveCompany || inactiveAgent || inactiveTenant) {
      throw new CustomError(
        statusCodes?.forbidden,
        "Account is inactive. Please contact administrator.",
        errorCodes?.account_disabled
      );
    }
    
    if (deletedCompany || deletedAgent || deletedTenant || deletedOwner) {
      throw new CustomError(
        statusCodes?.forbidden,
        "Account has been deleted. Please contact administrator.",
        errorCodes?.account_disabled
      );
    }

    throw new CustomError(
      statusCodes?.notFound,
      "No account found with this email address.",
      errorCodes?.not_found
    );
  }

  const passwordVerify = await user.isPasswordCorrect(password);

  // console.log("============>", passwordVerify);

  if (!passwordVerify) {
    throw new CustomError(
      statusCodes?.badRequest,
      Message?.inValid,
      errorCodes?.invalid_credentials
    );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  console.log("==================>", accessToken)
  console.log("==================>", refreshToken)

  const loggedInUser = await user.constructor
    .findById(user._id)
    .select("-password -refreshToken");

  res.setHeader("token", accessToken);

  const options = {
    httpOnly: true,
    secure: true, // Use true in production
  };

  // Return the response
  return {
    user: loggedInUser,
    role: user.role,
    accessToken,
    refreshToken,
    options,
  };
};

const generateAccessAndRefreshTokens = async (userId) => {
  const company = await Company.findById(userId);
  const agent = await Agent.findById(userId);
  const tenant = await Tenant.findById(userId);
  const owner = await Owner.findById(userId)
  
  let user;
  let userType;

  if (company) {
    user = company;
    userType = "company";
  } else if (agent) {
    user = agent;
    userType = "agent";
  } else if (tenant) {
    user = tenant;
    userType = "tenant";
  } else if (owner) {
    user = owner;
    userType = "owner";
  } else {
    throw new CustomError(
      statusCodes?.notFound,
      "User not found in any collection.",
      errorCodes?.user_not_found
    );
  }

  let accessToken, refreshToken;
  if (userType === "company") {
    accessToken = company.generateAccessToken();
    refreshToken = company.generateRefreshToken();
    user.refreshToken = refreshToken;
  } else if (userType === "agent") {
    accessToken = agent.generateAccessToken();
    refreshToken = agent.generateRefreshToken();
    user.refreshToken = refreshToken;
  } else if (userType === "tenant") {
    accessToken = tenant.generateAccessToken();
    refreshToken = tenant.generateRefreshToken();
    user.refreshToken = refreshToken;
  } else if (userType === "owner") {
    accessToken = owner.generateAccessToken();
    refreshToken = owner.generateRefreshToken();
    user.refreshToken = refreshToken;
  }

  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

export const getAllCompany = async (req) => {
  const AllComp = await Company.find({ isDeleted: false }).sort({
    createdAt: -1,
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
  const AllComp = await Company.find({ isDeleted: false, status: true }).sort({
    createdAt: -1,
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
  const AllComp = await Company.find({ isDeleted: false }).populate(
    "subcriptionId"
  );

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
  const companyDetails = await Company.findById(companyId);

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
  const editCompany = await Company.findByIdAndUpdate(CompanyId, updateData, {
    new: true,
    runValidators: true,
  });
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

  const company = await Company.findById(companyId);
  if (!company) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  company.isDeleted = true;
  await company.save();

  return company;
};

export const changestatus = async (req, res) => {
  const companyId = req.query.id;

  const company = await Company.findById(companyId);

  if (!company) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const newCompanyStatus = !company.status;
  company.status = newCompanyStatus;
  await company.save();

  await Agent.updateMany({ companyId }, { $set: { status: newCompanyStatus } });

  await Tenant.updateMany(
    { companyId },
    { $set: { status: newCompanyStatus } }
  );

  return company;
};

export const updateMailStatus = async (req, res) => {
  const companyId = req.body.id;

  const company = await Company.findById(companyId);

  if (!company) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const newStatus = !company.isMailStatus;
  company.isMailStatus = newStatus;
  await company.save();

  return company;
};

export const updateWhataapStatus = async (req, res) => {
  const companyId = req.body.id;

  const company = await Company.findById(companyId);

  if (!company) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const newStatus = !company.whatappStatus;
  company.whatappStatus = newStatus;
  await company.save();

  return company;
};

export const addSubcriptionPlan = async (req, res) => {
  const { companyId, SubscriptionId, buyDate } = req.body;
  const company = await Company.findById(companyId);

  if (!company) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }
  company.subcriptionId = SubscriptionId;
  company.subcriptionBuyDate = buyDate;
  await company.save();

  return company;
};

export const getTotalData = async (req) => {
  const company = await Company.find({ isDeleted: false });
  const tenant = await Tenant.find({ isDeleted: false });
  const agent = await Agent.find({ isDeleted: false });
  const properties = await Property.find({ isDeleted: false });
  const subscriptionPlan = await Subscription.find();
  const activeCompany = await Company.find({ isDeleted: false, status: true });

  const formattedData = [
    company.length,
    tenant.length,
    agent.length,
    properties.length,
    subscriptionPlan.length,
    activeCompany.length,
  ];

  return formattedData;
};

// export const commentAndResolved = async (req, res) => {
//   const companyId = req.query.id;
//   if (!companyId) {
//     throw new CustomError(
//       statusCodes.badRequest,
//       Message.missingId,
//       errorCodes.missing_id
//     );
//   }

//   const allComplain = await Complaint.find({ companyId, isDeleted: false })
//     .populate("tenantId")
//     .populate("propertyId", "propertyname")
//     .sort({ createdAt: -1 })
//     .lean();

//   if (!allComplain) {
//     throw new CustomError(
//       statusCodes?.conflict,
//       Message?.serverError,
//       errorCodes?.conflict
//     );
//   }
//   return allComplain;
// };


