import extraService from "../models/extracharge.model.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";

export const createExtraCharge = async (req, res) => {
  const {
    serviceName,
    details,
    price,
    companyId
  } = req.body;

  const extraCharge = await extraService.create({
    serviceName,
    details,
    price,
    companyId
  });
  return extraCharge;
};

export const editExtraAmount = async(req, res, next) => {
  const id = req.query.id;
  const updateData = req.body; 
  const editExtraAmount = await extraService.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true } 
  ) 

  if (!updateData) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable,
    );
  }
    return editExtraAmount;
};

export const getAllExtraCharge = async (req) => {
  const companyId = req.query.id;
  const allExtraCharge  = await extraService.find({companyId:companyId, isDeleted: false})
  .sort({ createdAt: -1 })

  if (!allExtraCharge) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return allExtraCharge;
};

export const getExtraChargeDetailsById = async(req, res, next) => {
  const extrachargeId = req.query.id;
  const extraCharge = await extraService.find({ _id:extrachargeId, isDeleted: false })
  if (!extraCharge  ) {
    return new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found,
    );
  }
  return extraCharge;
};

export const deleteExtraCharge = async (req, res) => {
  const {id} = req.query;

  const announcement = await extraService.findById({_id:id});
  if (!announcement) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  announcement.isDeleted = true;
  await announcement.save();
  return announcement ;
};