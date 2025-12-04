import * as ownerService from "../services/owner.services.js";
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";

export const ownerRegistration = async(req, res) => {
  const ownerData = await ownerService.registerOwner(req, res);
  res.status(statusCodes?.created).send(ownerData);
};

export const editOwner = async(req, res) => {
  const ownerData = await ownerService.editOwner(req, res);
  res.status(statusCodes?.created).send(ownerData);
};

export const getOwnerProperties = async(req, res) => {
  const ownerPropertyData = await ownerService.getAllOwnerProperties(req, res);
  res.status(statusCodes?.created).send(ownerPropertyData);
};

export const getOwnerPropertiesById = async(req, res, next) => {
  const bookingData = await ownerService.getOwnerPropertyByIdd(req, res);
  res.status(statusCodes?.created).send(bookingData);
};

export const getAllOwner = async(req, res) => {
  const ownerData = await ownerService.getAllOwner(req, res);
  res.status(statusCodes?.created).send(ownerData);
};

export const bulkUploadOwner = async(req, res) => {
  const ownerData = await ownerService.bulkUploadOwner(req, res);
  res.status(statusCodes?.created).send(ownerData);
};

export const deleteOwner = async(req, res) => {
  const ownerData = await ownerService.deleteOwner(req, res);
  res.status(statusCodes?.created).send(ownerData);
};

export const getOwnerById = async(req, res) => {
  const ownerData = await ownerService.getOwnerById(req, res);
  res.status(statusCodes?.created).send(ownerData);
};

export const getPropertyByOwnerId = async(req, res) => {
  const ownerData = await ownerService.getPropertyByOwnerId(req, res);
  res.status(statusCodes?.created).send(ownerData);
};

export const ownerLogin = async (req, res) => {
  const data = await ownerService.loginOwner(req, res);
  res
    .status(statusCodes?.ok)
    .cookie("accessToken", data?.accessToken, data?.options)
    .cookie("refreshToken", data?.refreshToken, data?.options)
    .send(data?.loginOwner);
};
