import * as serviceProvider from '../services/serviceProvider.services.js';
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";



export const createServiceProvider = async(req, res, next) => {
  const ServiceProvider = await serviceProvider.createServiceProvider(req, res, next);
  res.status(statusCodes?.created).send(ServiceProvider);
};

export const editServiceProvider = async(req, res, next) => {
  const ServiceProvider = await serviceProvider.editServiceProvider(req, res, next);
  res.status(statusCodes?.created).send(ServiceProvider);
};

export const getServiceProviders = async(req, res, next) => {
  const ServiceProvider = await serviceProvider.getServiceProviders(req, res, next);
  res.status(statusCodes?.created).send(ServiceProvider);
};

export const deleteServiceProvider = async(req, res, next) => {
  const ServiceProvider = await serviceProvider.deleteServiceProvider(req, res, next);
  res.status(statusCodes?.created).send(ServiceProvider);
}
;
export const invoiceProvider = async(req, res) => {
  const invoiceProvider = await serviceProvider.postInvoice(req, res);
  res.status(statusCodes?.created).send(invoiceProvider);
};

// export const getById = async(req, res, next) => {
//   const propertyData = await propertyServices.getProperty(req, res, next);
//   res.status(statusCodes?.created).send(propertyData);
// };

// export const getVacantProperty = async(req, res, next) => {
//   const propertyData = await propertyServices.getVacantProperty(req, res, next);
//   res.status(statusCodes?.created).send(propertyData);
// };

// export const getPropertyById = async(req, res, next) => {
//   const propertyData = await propertyServices.getPropertyById(req, res, next);
//   res.status(statusCodes?.created).send(propertyData);
// };

// export const getAllProperties = async(req, res, next) => {
//   const propertyData = await propertyServices.getAllProperties(req, res, next);
//   res.status(statusCodes?.created).send(propertyData);
// };
