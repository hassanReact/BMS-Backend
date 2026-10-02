import AppDataSource from "../core/database/data-source.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";

const extraChargeRepository = AppDataSource.getRepository("ExtraCharge");

export const createExtraCharge = async (req, res) => {
  const {
    serviceName,
    details,
    price,
    companyId
  } = req.body;

  const extraCharge = extraChargeRepository.create({
    serviceName,
    details,
    price,
    companyId
  });
  await extraChargeRepository.save(extraCharge);
  return extraCharge;
};

export const editExtraAmount = async(req, res, next) => {
  const id = req.query.id;
  const updateData = req.body; 
  const extraCharge = await extraChargeRepository.findOne({
    where: { id }
  });
  const editExtraAmount = extraCharge
    ? await extraChargeRepository.save(extraChargeRepository.merge(extraCharge, updateData))
    : null;

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
  const allExtraCharge = await extraChargeRepository.find({
    where: { companyId, isDeleted: false },
    order: { createdAt: "DESC" }
  });

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
  const extraCharge = await extraChargeRepository.find({
    where: { id: extrachargeId, isDeleted: false }
  });
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

  const announcement = await extraChargeRepository.findOne({
    where: { id }
  });
  if (!announcement) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  announcement.isDeleted = true;
  await extraChargeRepository.save(announcement);
  return announcement ;
};