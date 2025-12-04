import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import Complaint from "../models/complaints.model.js";

export const complainRegistration = async (req, res) => {

  const { tenantName, propertyId, companyId, tenantId, concernTopic, description, staffId, staffName } = req.body;

  const isComplainAlreadyExist = await Complaint.findOne({ concernTopic });

  if (isComplainAlreadyExist) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  const complain = await Complaint.create({
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

  return complain;
};

export const complainAgentRegistration = async (req, res) => {

  const { tenantName, propertyId, companyId, tenantId, agentId, concernTopic, description } = req.body;

  const isComplainAlreadyExist = await Complaint.findOne({ concernTopic });

  if (isComplainAlreadyExist) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  const complain = await Complaint.create({
    tenantName,
    propertyId,
    companyId,
    tenantId,
    agentId,
    concernTopic,
    description,
  });

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

  const allComplain = await Complaint.find({
    $or: [{ tenantId: id }, { agentId: id }],
    isDeleted: false
  }).sort({ createdAt: -1 });

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

  const allComplain = await Complaint.find({ tenantId, isDeleted: false }).sort({ createdAt: -1 });

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
  const editComplain = await Complaint.findByIdAndUpdate(
    ComplaintId,
    updateData,
    { new: true, runValidators: true }
  )

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

  const complain = await Complaint.findById(compalainId);
  if (!complain) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  complain.isDeleted = true;
  await complain.save();
  return complain;
};

export const resolveComplain = async (req, res) => {
  const compalainId = req.query.id;

  const complain = await Complaint.findById(compalainId);
  if (!complain) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  complain.status = !complain.status;

  await complain.save();
  return complain;
};

export const addCommentToComplain = async (req, res) => {
  // const compalainId = req.query.id;
  const { id } = req.query;
  const { comment } = req.body;

  const complain = await Complaint.findById(id);
  if (!complain) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  complain.comment = comment || complain.comment;

  await complain.save();
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
  const complain = await Complaint.find({ _id: complainId, isDeleted: false })
    .populate("tenantId")
    .populate("propertyId")
    .populate("companyId")
    .lean();

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


  const allComplain = await Complaint.find({
    companyId,
    isDeleted: false,
  })
    .populate("tenantId")
    .populate("propertyId", "propertyname")
    .populate("assignedId", "staffName") // make sure you're populating the correct field
    .sort({ createdAt: -1 })
    .lean();

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


  const allComplain = await Complaint.find({ companyId, isDeleted: false, agentId: { $exists: true } })
    .populate("tenantId")
    .populate("agentId")
    .populate("propertyId", "propertyname")
    .sort({ createdAt: -1 })
    .lean();

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

  const complain = await Complaint.findById(complaintId);

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

  await complain.save();
  return complain
}