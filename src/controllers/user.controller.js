import * as userService from "../services/user.services.js";
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";

export const userRegistration = async(req, res, next) => {
  const userData = await userService.registerUser(req, res, next);
  res.status(statusCodes?.created).send(userData);
};

export const userLogin = async (req, res, next) => {
  const data = await userService.loginUser(req, res, next);
  res
    .status(statusCodes?.ok)
    .cookie("accessToken", data?.accessToken, data?.options)
    .cookie("refreshToken", data?.refreshToken, data?.options)
    .send(data);
};

