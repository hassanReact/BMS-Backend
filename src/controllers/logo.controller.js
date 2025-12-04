import * as logoService from "../services/logo.services.js";
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";

export const logoUpload = async(req, res, next) => {
  const userData = await logoService.uploadLogo(req, res, next);
  res.status(statusCodes?.created).send(userData);
};

export const getUplaod = async (req, res, next) => {
  const userData = await logoService.getUploadedLogo(req, res, next);
  res.status(statusCodes?.created).send(userData);
};

