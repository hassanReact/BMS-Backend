import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import AppDataSource from "../core/database/data-source.js";
import { IsNull, Not } from "typeorm";

const complaintRepository = AppDataSource.getRepository("Complaint");

export const complainRegistration = async (req, res) => {

  const { tenantName, propertyId, companyId, tenantId, concernTopic, description, staffId, staffName } = req.body;

  const isComplainAlreadyExist = await complaintRepository.findOne({ where: { concernTopic } });

  if (isComplainAlreadyExist) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  const complain = complaintRepository.create({
    assignedId: staffId,
    assignedName: staffName,
    tenantName,
    propertyId,
    companyId,
    tenantId,
    concernTopic,
    description,
    status: !!(staffId && staffName),
  });
  await complaintRepository.save(complain);

  return complain;
};

export const complainAgentRegistration = async (req, res) => {

  const { tenantName, propertyId, companyId, tenantId, agentId, concernTopic, description } = req.body;

  const isComplainAlreadyExist = await complaintRepository.findOne({ where: { concernTopic } });

  if (isComplainAlreadyExist) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  const complain = complaintRepository.create({
    tenantName,
    propertyId,
    companyId,
    tenantId,
    agentId,
    concernTopic,
    description,
  });
  await complaintRepository.save(complain);

  return complain;
};

export const allComplain = async (req) => {
  const { id } = req.query;

  if (!id) {
    throw new CustomError(
      statusCodes.badRequest,
      Message.missingId,
      errorCodes.missing_id
    );
  }

  const allComplain = await complaintRepository.find({
    where: [
      { tenantId: id, isDeleted: false },
      { agentId: id, isDeleted: false },
    ],
    order: { createdAt: "DESC" },
  });

  if (!allComplain) {
    throw new CustomError(
      statusCodes.conflict,
      Message.serverError,
      errorCodes.conflict
    );
  }

  return allComplain;
};

export const allComplainForCompanyallComplain = async (req) => {
  const tenantId = req.query.id;
  if (!tenantId) {
    throw new CustomError(
      statusCodes.badRequest,
      Message.missingId,
      errorCodes.missing_id
    );
  }

  const allComplain = await complaintRepository.find({
    where: { tenantId, isDeleted: false },
    order: { createdAt: "DESC" },
  });

  if (!allComplain) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.serverError,
      errorCodes?.conflict,
    );
  }
  return allComplain;
};

export const editComplain = async (req, res, next) => {
  const ComplaintId = req.query.id;
  const updateData = req.body;
  const complain = await complaintRepository.findOne({ where: { id: ComplaintId } });
  const editComplain = complain
    ? await complaintRepository.save(Object.assign(complain, updateData))
    : null;

  if (!updateData) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable,
    );
  }
  return editComplain;
};

export const deleteComplain = async (req, res) => {
  const compalainId = req.query.id;

  const complain = await complaintRepository.findOne({ where: { id: compalainId } });
  if (!complain) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  complain.isDeleted = true;
  await complaintRepository.save(complain);
  return complain;
};

export const resolveComplain = async (req, res) => {
  const compalainId = req.query.id;

  const complain = await complaintRepository.findOne({ where: { id: compalainId } });
  if (!complain) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  complain.status = !complain.status;

  await complaintRepository.save(complain);
  return complain;
};

export const addCommentToComplain = async (req, res) => {
  // const compalainId = req.query.id;
  const { id } = req.query;
  const { comment } = req.body;

  const complain = await complaintRepository.findOne({ where: { id } });
  if (!complain) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  complain.comment = comment || complain.comment;

  await complaintRepository.save(complain);
  return complain;
};

export const fetchComplainById = async (req, res) => {
  const complainId = req.query.id;
  if (!complainId) {
    throw new CustomError(
      statusCodes.badRequest,
      Message.missingId,
      errorCodes.missing_id
    );
  }
  const complain = await complaintRepository.find({
    where: { id: complainId, isDeleted: false },
    relations: ["tenant", "property", "company"],
  });

  if (!complain) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }
  return complain;
}


export const allComplainForCompany = async (req, res) => {
  const companyId = req.query.id;
  if (!companyId) {
    throw new CustomError(
      statusCodes.badRequest,
      Message.missingId,
      errorCodes.missing_id
    );
  }


  const allComplain = await complaintRepository.find({
    where: {
      companyId,
      isDeleted: false,
    },
    relations: ["tenant", "property", "assignedStaff"],
    order: { createdAt: "DESC" },
  });

  if (!allComplain) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.serverError,
      errorCodes?.conflict
    );
  }

  return allComplain;
};

export const getAllComplainCompanyAgent = async (req, res) => {
  const companyId = req.query.id;
  if (!companyId) {
    throw new CustomError(
      statusCodes.badRequest,
      Message.missingId,
      errorCodes.missing_id
    );
  }


  const allComplain = await complaintRepository.find({
    where: {
      companyId,
      isDeleted: false,
      agentId: Not(IsNull()),
    },
    relations: ["tenant", "agent", "property"],
    order: { createdAt: "DESC" },
  });

  if (!allComplain) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.serverError,
      errorCodes?.conflict
    );
  }


  return allComplain;
};

export const assignStaffToTenant = async (req, res) => {
  const complaintId = req.query.id;
  const { staffId, staffName } = req.body;

  const complain = await complaintRepository.findOne({ where: { id: complaintId } });

  if (!complain) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable,
    );
  };

  complain.assignedId = staffId;
  complain.assignedName = staffName;
  complain.status = true;

  await complaintRepository.save(complain);
  return complain
}