import * as propertyServices from '../services/property.services.js';
import { statusCodes } from "../core/common/constant.js";


export const createProperty = async (req, res, next) => {
  const propertyData = await propertyServices.createProperty(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};

export const editProperty = async (req, res, next) => {
  const propertyData = await propertyServices.editProperty(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};


export const uploadImages = async (req, res, next) => {
  const propertyData = await propertyServices.uploadImages(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};

export const getProperty = async (req, res, next) => {
  const propertyData = await propertyServices.getProperty(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};

export const getAllImages = async (req, res, next) => {
  const propertyData = await propertyServices.getAllImages(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};

export const deleteProperty = async (req, res, next) => {
  const propertyData = await propertyServices.deleteProperty(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};

export const getById = async (req, res, next) => {
  const propertyData = await propertyServices.getProperty(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};

export const getVacantProperty = async (req, res, next) => {
  const propertyData = await propertyServices.getVacantProperty(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};

export const getPropertyById = async (req, res, next) => {
  const propertyData = await propertyServices.getPropertyById(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};

export const getAllProperties = async (req, res, next) => {
  const propertyData = await propertyServices.getAllProperties(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};

export const deletePropertyImg = async (req, res, next) => {
  const propertyData = await propertyServices.deletePropertyImg(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};