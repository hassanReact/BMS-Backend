// import * as compa from "../services/owner.services.js";
// import * as companyServices from "../services/company.services.js";
import * as complainServices from "../services/complain.services.js";
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";

export const complainRegistration = async (req, res) => {
  const complainData = await complainServices.complainRegistration(req, res);
  res.status(statusCodes?.created).send(complainData);
};

export const allComplain = async (req, res) => {
  const complainData = await complainServices.allComplain(req, res);
  res.status(statusCodes?.created).send(complainData);
};

export const editComplain = async (req, res) => {
  const complainData = await complainServices.editComplain(req, res);
  res.status(statusCodes?.created).send(complainData);
};

export const deleteComplain = async (req, res) => {
  const complainData = await complainServices.deleteComplain(req, res);
  res.status(statusCodes?.created).send(complainData);
};

export const getTenantReporter = async (req, res) => {
  const complainData = await complainServices.getTenantReporter(req, res);
  res.status(statusCodes?.created).send(complainData);
};

export const allComplainForCompany = async (req, res) => {
  const complainData = await complainServices.allComplainForCompany(req, res);
  res.status(statusCodes?.created).send(complainData);
};

export const getComplainById = async (req, res) => {
  const complainData = await complainServices.fetchComplainById(req, res);
  res.status(statusCodes?.created).send(complainData);
};

export const resolveComplain = async (req, res) => {
  const complainData = await complainServices.resolveComplain(req, res);
  res.status(statusCodes?.created).send(complainData);
};

export const addCommentToComplain = async (req, res) => {
  const complainData = await complainServices.addCommentToComplain(req, res);
  res.status(statusCodes?.created).send(complainData);
};


export const getAllComplainCompanyAgent = async (req, res) => {
  const complainData = await complainServices.getAllComplainCompanyAgent(req, res);
  res.status(statusCodes?.created).send(complainData);
};

export const assignStaff = async (req, res) => {
  const assigned = await complainServices.assignStaffToTenant(req, res);
  res.status(statusCodes.created).send(assigned);
}