import AppDataSource from "../core/database/data-source.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";

const announcementRepository = AppDataSource.getRepository("Announcement");

export const createAnnouncement = async (req, res) => {
  const {
    topic,
    details,
    companyId
  } = req.body;

  const newAnnouncement = announcementRepository.create({
    topic,
    details,
    companyId
  });
  await announcementRepository.save(newAnnouncement);
  return newAnnouncement;
};

export const editAnnouncement = async(req, res, next) => {
  const id = req.query.id;
  const updateData = req.body; 
  const announcement = await announcementRepository.findOne({ where: { id } });
  const editAmmouncement = announcement
    ? await announcementRepository.save(Object.assign(announcement, updateData))
    : null;

  if (!updateData) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable,
    );
  }
    return editAmmouncement;
};

export const getAllAnnouncement = async (req) => {
  const companyId = req.query.id;
  const allAnnouncement  = await announcementRepository.find({
    where: { companyId: companyId, isDeleted: false },
    order: { createdAt: "DESC" },
  });

  if (!allAnnouncement) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  return allAnnouncement;
};

export const getAnnouncementById = async(req, res, next) => {
  const announcementId = req.query.id;
  const announcement = await announcementRepository.find({
    where: { id: announcementId, isDeleted: false },
  });
  if (!announcement  ) {
    return new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found,
    );
  }
  return announcement;
};

export const deleteAnnounment = async (req, res) => {
  const {id} = req.query;

  const announcement = await announcementRepository.findOne({ where: { id } });
  if (!announcement) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  announcement.isDeleted = true;
  await announcementRepository.save(announcement);
  return announcement ;
};