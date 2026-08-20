// import { asyncHandler } from "../utils/asyncWrapper.js";
// import jwt from "jsonwebtoken";
// import User from "../models/user.model.js";
// import CustomError from "../utils/exception.js";
// import { statusCodes } from "../core/common/constant.js";
// import { Message } from "../core/common/constant.js";
// import { errorCodes } from "../core/common/constant.js";
// import Company from "../models/company.model.js";

// export const authMiddleware = asyncHandler(async (req, res, next) => {
//   let token;
//   if (req?.headers?.token) {
//     try {
//       token = req?.headers?.token;
//       const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
//       const authenticatedUser = await Company.findById(decoded._id);

//       if (!authenticatedUser) {
//         throw new CustomError(
//           statusCodes?.notFound,
//           "Company not found",
//           errorCodes?.not_found
//         );
//       }
//       req.user = authenticatedUser;
//       next();
//     } catch (error) {
//       if (error.name === 'JsonWebTokenError') {
//         throw new CustomError(
//           statusCodes?.unauthorized,
//           "Invalid token",
//           errorCodes?.unauthorized
//         );
//       } else if (error.name === 'TokenExpiredError') {
//         throw new CustomError(
//           statusCodes?.unauthorized,
//           "Token expired",
//           errorCodes?.unauthorized
//         );
//       } else {
//         throw new CustomError(
//           statusCodes?.internalServerError,
//           "Authentication failed",
//           errorCodes?.internal_server_error
//         );
//       }
//     }
//   } else {
//     throw new CustomError(
//       statusCodes?.unauthorized,
//       "Token is required",
//       errorCodes?.unauthorized
//     );
//   }
// });


import { asyncHandler } from "../utils/asyncWrapper.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import UserRole from "../models/userRole.model.js";
import CustomError from "../utils/exception.js";
import {
  statusCodes,
  errorCodes,
} from "../core/common/constant.js";

export const authMiddleware = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers?.token) {
    token = req.headers.token;
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw new CustomError(
      statusCodes?.unauthorized,
      "Token is required",
      errorCodes?.unauthorized
    );
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    // JWT now contains userId
    const user = await User.findOne({
      _id: decoded.userId,
      isDeleted: false,
    });

    if (!user) {
      throw new CustomError(
        statusCodes?.unauthorized,
        "User account not found",
        errorCodes?.unauthorized
      );
    }

    // Verify that the role/company in token is actually assigned
    const userRole = await UserRole.findOne({
      userId: user._id,
      roleId: decoded.roleId,
      companyId: decoded.companyId,
      Status: "active",
    })
      .populate("roleId")
      .populate("companyId");

    if (!userRole) {
      throw new CustomError(
        statusCodes?.forbidden,
        "User does not have access to this role or company",
        errorCodes?.unauthorized
      );
    }

    // Put authenticated information on request
    req.user = user;

    req.auth = {
      userId: user._id,
      roleId: userRole.roleId._id,
      role: userRole.roleId.name,
      companyId: userRole.companyId._id,
    };

    next();

  } catch (error) {

    if (error.name === "JsonWebTokenError") {
      throw new CustomError(
        statusCodes?.unauthorized,
        "Invalid token",
        errorCodes?.unauthorized
      );
    }

    if (error.name === "TokenExpiredError") {
      throw new CustomError(
        statusCodes?.unauthorized,
        "Token expired",
        errorCodes?.unauthorized
      );
    }

    throw error;
  }
});