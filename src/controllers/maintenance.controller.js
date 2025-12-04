import * as maintenance from '../services/maintenance.services.js';
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";



export const createMaintenance = async (req, res, next) => {
  const Maintenance = await maintenance.createMaintenance(req, res, next);
  res.status(statusCodes?.created).send(Maintenance);
};

export const editMaintenance = async (req, res, next) => {
  const Maintenance = await maintenance.editMaintenance(req, res, next);
  res.status(statusCodes?.created).send(Maintenance);
};

export const getMaintenance = async (req, res, next) => {
  const Maintenance = await maintenance.getMaintenance(req, res, next);
  res.status(statusCodes?.created).send(Maintenance);
};

export const deleteMaintenance = async (req, res, next) => {
  const Maintenance = await maintenance.deleteMaintenance(req, res, next);
  res.status(statusCodes?.created).send(Maintenance);
};

export const applyMaintainance = async (req, res) => {
  const Applied = await maintenance.applyToOccupied(req, res);
  res.status(statusCodes?.created).send(Applied)
}