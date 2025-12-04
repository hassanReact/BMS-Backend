import * as announcementServices from '../services/announcement.services.js';
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";



export const createAnnouncement = async(req, res, next) => {
  const announcement = await announcementServices.createAnnouncement(req, res);
  res.status(statusCodes?.created).send(announcement);
};


export const editAnnouncement = async(req, res, next) => {
  const announcement = await announcementServices.editAnnouncement(req, res);
  res.status(statusCodes?.created).send(announcement);
};

export const getAllAnnouncement = async(req, res, next) => {
  const announcement = await announcementServices.getAllAnnouncement(req, res);
  res.status(statusCodes?.created).send(announcement);
};

export const getAnnouncementById = async(req, res, next) => {
  const announcement = await announcementServices.getAnnouncementById(req, res);
  res.status(statusCodes?.created).send(announcement);
};

export const deleteAnnounment = async(req, res, next) => {
  const announcement = await announcementServices.deleteAnnounment(req, res);
  res.status(statusCodes?.created).send(announcement);
};


