import { asyncHandler } from "../utils/asyncWrapper.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import CustomError from "../utils/exception.js";
import { statusCodes } from "../core/common/constant.js";
import { Message } from "../core/common/constant.js";
import { errorCodes } from "../core/common/constant.js";
import Company from "../models/company.model.js";

export const authMiddleware = asyncHandler(async (req, res, next) => {
  let token;
  if (req?.headers?.token) {
    try {
      token = req?.headers?.token;
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const authenticatedUser = await Company.findById(decoded._id);

      if (!authenticatedUser) {
        throw new CustomError(
          statusCodes?.notFound,
          "Company not found",
          errorCodes?.not_found
        );
      }
      req.user = authenticatedUser;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new CustomError(
          statusCodes?.unauthorized,
          "Invalid token",
          errorCodes?.unauthorized
        );
      } else if (error.name === 'TokenExpiredError') {
        throw new CustomError(
          statusCodes?.unauthorized,
          "Token expired",
          errorCodes?.unauthorized
        );
      } else {
        throw new CustomError(
          statusCodes?.internalServerError,
          "Authentication failed",
          errorCodes?.internal_server_error
        );
      }
    }
  } else {
    throw new CustomError(
      statusCodes?.unauthorized,
      "Token is required",
      errorCodes?.unauthorized
    );
  }
});
