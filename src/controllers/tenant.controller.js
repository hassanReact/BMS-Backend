import * as tenantServices from "../services/tenant.services.js";
import { statusCodes } from "../core/common/constant.js";


export const createTenant = async(req, res, next) => {
  const tenantData = await tenantServices.createTenant(req, res);
  res.status(statusCodes?.created).send(tenantData);
};

export const tenantLogin = async (req, res) => {
  const data = await tenantServices.loginTenant(req, res);
  res
    .status(statusCodes?.ok)
    .cookie("accessToken", data?.accessToken, data?.options)
    .cookie("refreshToken", data?.refreshToken, data?.options)
    .send(data?.loginTenant);
};

export const getMyTenants = async(req, res, next) => {
  const TenantData = await tenantServices.getMyTenants(req, res, next);
  res.status(statusCodes?.created).send(TenantData);
};

export const bulkUploadTenants = async(req, res, next) => {
  const TenantData = await tenantServices.bulkUploadTenants(req, res, next);
  res.status(statusCodes?.created).send(TenantData);
};

export const getAllDocs = async(req, res, next) => {
  const TenantData = await tenantServices.getAllDocs(req, res, next);
  res.status(statusCodes?.created).send(TenantData);
};

export const mybookings = async(req, res, next) => {
  const bookingData = await tenantServices.mybooking(req, res, next);
  res.status(statusCodes?.created).send(bookingData);
};

export const mypropertie = async(req, res, next) => {
  const bookingData = await tenantServices.myproperties(req, res, next);
  res.status(statusCodes?.created).send(bookingData);
};

export const getTenantsById = async(req, res, next) => {
  const TenantData = await tenantServices.getTenantsById(req, res, next);
  res.status(statusCodes?.created).send(TenantData);
};

export const editTenant = async(req, res) => {
  const TenantData = await tenantServices.editTenant(req, res);
  res.status(statusCodes?.created).send(TenantData);
};

export const deleteTenantById = async(req, res) => {
  const deletedData = await tenantServices.deleteTenantById(req, res);
  res.status(statusCodes?.created).send(deletedData);
};

export const getTenants = async(req, res, next) => {
  const propertyData = await tenantServices.getTenants(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};

export const changePasswordTenant = async(req, res, next) => {
  const propertyData = await tenantServices.changePassword(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};

export const getAllTenants = async(req, res, next) => {
  const propertyData = await tenantServices.getAllTenants(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};

export const uploadDocuments = async(req, res, next) => {
  const tenantData = await tenantServices.uploadDocuments(req, res, next);
  res.status(statusCodes?.created).send(tenantData);
};

export const deleteTenantDocs = async(req, res, next) => {
  const tenantData = await tenantServices.deleteTenantDocs(req, res, next);
  res.status(statusCodes?.created).send(tenantData);
};