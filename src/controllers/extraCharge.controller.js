import * as extraService from '../services/extraCharge.services.js';
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";

export const createExrtaCharge = async(req, res, next) => {
  const extraCharge = await extraService.createExtraCharge(req, res);
  res.status(statusCodes?.created).send(extraCharge);
};

export const editExtraAmount = async(req, res, next) => {
  const extraCharge = await extraService.editExtraAmount(req, res);
  res.status(statusCodes?.created).send(extraCharge);
};

export const getAllExtraCharge = async(req, res, next) => {
  const extraCharge = await extraService.getAllExtraCharge(req, res);
  res.status(statusCodes?.created).send(extraCharge);
};

export const getExtraChargeDetailsById = async(req, res, next) => {
  const extraCharge = await extraService.getExtraChargeDetailsById(req, res);
  res.status(statusCodes?.created).send(extraCharge);
};

export const deleteExtraCharge = async(req, res, next) => {
  const announcement = await extraService.deleteExtraCharge(req, res);
  res.status(statusCodes?.created).send(announcement);
};


