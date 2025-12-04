// import * as tenantServices from "../services/tenant.services.js";
import * as bookingServices from "../services/booking.services.js";
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";



export const createBooking = async(req, res, next) => {
  const bookingData = await bookingServices.createBooking(req, res);
  res.status(statusCodes?.created).send(bookingData);
};

export const createbill = async(req, res, next) => {
  const bookingData = await bookingServices.createbill(req, res);
  res.status(statusCodes?.created).send(bookingData);
};

export const getBooking = async(req, res, next) => {
  const bookingData = await bookingServices.getBooking(req, res);
  res.status(statusCodes?.created).send(bookingData);
};

export const getAllBooking = async(req, res, next) => {
  const bookingData = await bookingServices.getAllBooking(req, res);
  res.status(statusCodes?.created).send(bookingData);
};

export const editBooking = async(req, res, next) => {
  const bookingData = await bookingServices.editBooking(req, res);
  res.status(statusCodes?.created).send(bookingData);
};

export const getBookingById = async(req, res, next) => {
  const bookingData = await bookingServices.getBookingById(req, res);
  res.status(statusCodes?.created).send(bookingData);
};

export const breakTheBooking = async(req, res, next) => {
  const bookingData = await bookingServices.breakTheBooking(req, res);
  res.status(statusCodes?.created).send(bookingData);
};

export const PropertyOnNotice = async(req, res, next) => {
  const propertyData = await bookingServices.vacantPropertyOnNotice(req, res, next);
  res.status(statusCodes?.created).send(propertyData);
};