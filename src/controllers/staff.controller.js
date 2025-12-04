import * as staffServices from '../services/staff.services.js';
import { statusCodes } from "../core/common/constant.js";



export const createstaff = async (req, res, next) => {
  const staffData = await staffServices.createStaff(req, res);
  res.status(statusCodes?.created).send(staffData);
};

export const staffLogin = async (req, res) => {
  const data = await staffServices.loginStaff(req, res);
  res
    .status(statusCodes?.ok)
    .cookie("accessToken", data?.accessToken, data?.options)
    .cookie("refreshToken", data?.refreshToken, data?.options)
    .send(data?.loginstaff);
};

export const editstaff = async (req, res, next) => {
  const staffData = await staffServices.editStaff(req, res);
  res.status(statusCodes?.created).send(staffData);
};

export const getStaffById = async (req, res, next) => {
  const staffData = await staffServices.getStaffById(req, res);
  res.status(statusCodes?.created).send(staffData);
};

export const getAllStaff = async (req, res, next) => {
  const staffData = await staffServices.getAllStaff(req, res);
  res.status(statusCodes?.created).send(staffData);
};

export const deleteStaff = async (req, res, next) => {
  const staffData = await staffServices.deleteStaff(req, res);
  res.status(statusCodes?.ok).send(staffData);
};

export const changePassword = async (req, res, next) => {
  const staffData = await staffServices.changePassword(req, res);
  res.status(statusCodes?.created).send(staffData);
};

export const getAllJobs = async (req, res) => {
  const allJobs = await staffServices.getAllJobs(req, res);
  res.status(statusCodes?.ok).json(allJobs);
}

export const changeStatusOfJob = async (req, res) => {
  const updateJob = await staffServices.changeStatusOfJob(req, res);
  res.status(statusCodes?.created).send(updateJob);
}