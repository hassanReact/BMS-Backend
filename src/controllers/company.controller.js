// import * as compa from "../services/owner.services.js";
import * as companyServices from "../services/company.services.js";
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";

export const companyRegistration = async (req, res) => {
  const companyData = await companyServices.companyRegistration(req, res);
  res.status(statusCodes?.created).send(companyData);
};

export const addSMTPMailPassword = async (req, res) => {
  const companyData = await companyServices.addSMTPMailPassword(req, res);
  res.status(statusCodes?.created).send(companyData);
};

export const changePassword = async (req, res) => {
  const companyData = await companyServices.changePassword(req, res);
  res.status(statusCodes?.created).send(companyData);
};

export const updateMailStatus = async (req, res) => {
  const companyData = await companyServices.updateMailStatus(req, res);
  res.status(statusCodes?.created).send(companyData);
};


export const updateWhataapStatus = async (req, res) => {
  const companyData = await companyServices.updateWhataapStatus(req, res);
  res.status(statusCodes?.created).send(companyData);
};
export const totalData = async (req, res) => {
  const companyData = await companyServices.getTotalData(req, res);
  res.status(statusCodes?.created).send(companyData);
};

export const totalActiveCompany = async (req, res) => {
  const companyData = await companyServices.totalActiveCompany(req, res);
  res.status(statusCodes?.created).send(companyData);
};

export const addSubcriptionPlan = async (req, res) => {
  const companyData = await companyServices.addSubcriptionPlan(req, res);
  res.status(statusCodes?.created).send(companyData);
};

export const companySubscriptionDetails = async (req, res) => {
  const companyData = await companyServices.companySubscriptionDetails(req, res);
  res.status(statusCodes?.created).send(companyData);
};

export const universalLogin = async (req, res) => {
  const data = await companyServices.universalLogin(req, res);
  res
    .status(statusCodes?.ok)
    .cookie("accessToken", data?.accessToken, data?.options)
    .cookie("refreshToken", data?.refreshToken, data?.options)
    .send(data);
};

export const getAllCompany = async (req, res) => {
  const companyData = await companyServices.getAllCompany(req, res);
  res.status(statusCodes?.created).send(companyData);
};

export const changestatus = async (req, res) => {
  const companyData = await companyServices.changestatus(req, res);
  res.status(statusCodes?.created).send(companyData);
};

export const getCompanyById = async (req, res) => {
  const getCurrency = await companyServices.getCompanyById(req, res);
  res.status(statusCodes?.created).send(getCurrency);
};

export const currency = async (req, res) => {
  const currency = await companyServices.currency(req, res);
  res.status(statusCodes?.created).send(currency);
};

export const editCompany = async (req, res) => {
  const companyData = await companyServices.editCompany(req, res);
  res.status(statusCodes?.created).send(companyData);
};

export const deleteCompany = async (req, res) => {
  const companyData = await companyServices.deleteCompany(req, res);
  res.status(statusCodes?.created).send(companyData);
};

export const commentAndResolved = async (req, res) => {
  const companyData = await companyServices.commentAndResolved(req, res);
  res.status(statusCodes?.created).send(companyData);
};