import  TransactionalAccounts  from "../models/transactionalAccounts.model.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";


export const createTransactionalAccount = async (req, res) => {

    const {
      accountName,
      accountNumber,
      details,
      companyId
    } = req.body;

    const transactionalAccount = await TransactionalAccounts.create({
      accountName,
      accountNumber,
      details,
      companyId
    });

    return transactionalAccount;
};

export const getTransactionalAccountById = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new CustomError(
      statusCodes.badRequest,
      "Transactional Account ID is required.",
      errorCodes.missing_id
    );
  }

  const transactionalAccount = await TransactionalAccounts.findOne({
    _id: id,
    isDeleted: false
  });

  if (!transactionalAccount) {
    throw new CustomError(
      statusCodes.notFound,
      Message.notFound,
      errorCodes.not_found
    );
  }

  return transactionalAccount;
};



export const editTransactionalAccount = async (req, res) => {
    const transactionalAccountId = req.query.id;

    if (!transactionalAccountId) {
      return res.status(400).json({
        message: "Transactional Account ID is required.",
        errorCode: "transactionalAccount_id_missing",
      });
    }

    const {
      accountName,
      accountNumber,
      details,
      companyId
    } = req.body;

    const updateData = {
      accountName,
      accountNumber,
      details,
      companyId
    };
    const updatedTransactionalAccount = await TransactionalAccounts.findByIdAndUpdate(
      transactionalAccountId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedTransactionalAccount) {
      return res.status(404).json({
        message: "Transactional Account not found.",
        errorCode: "Transactional Account Error",
      });
    }

    return updatedTransactionalAccount;
  
};



export const deleteTransactionalAccount = async (req, res) => {
  const transactionalAccount = req.query.id;

  const transactionalAccountData = await TransactionalAccounts.findById(transactionalAccount);
  if (!transactionalAccountData) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  } 

  transactionalAccountData.isDeleted = true;
  await transactionalAccountData.save();

  return transactionalAccountData
};

export const getTransactionalAccount = async (req, res) => {
  const companyId = req.query.id;

  const transactionalAccount = await TransactionalAccounts.find({
    companyId,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  if (!transactionalAccount) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }
  return transactionalAccount;
};
