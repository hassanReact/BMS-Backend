import AppDataSource from "../core/database/data-source.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";

const transactionalAccountRepository = AppDataSource.getRepository("TranstionalAccounts");


export const createTransactionalAccount = async (req, res) => {
  const { accountName, accountNumber, details, companyId } = req.body;

  const transactionalAccount = transactionalAccountRepository.create({
    accountName,
    accountNumber,
    details,
    companyId,
  });

  await transactionalAccountRepository.save(transactionalAccount);

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

  const transactionalAccount = await transactionalAccountRepository.findOne({
    where: {
      id,
      isDeleted: false,
    },
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

  const { accountName, accountNumber, details, companyId } = req.body;

  const existingTransactionalAccount = await transactionalAccountRepository.findOne({
    where: {
      id: transactionalAccountId,
      isDeleted: false,
    },
  });

  if (!existingTransactionalAccount) {
    return res.status(404).json({
      message: "Transactional Account not found.",
      errorCode: "Transactional Account Error",
    });
  }

  const updateData = {
    accountName,
    accountNumber,
    details,
    companyId,
  };

  Object.assign(existingTransactionalAccount, updateData);
  const updatedTransactionalAccount = await transactionalAccountRepository.save(
    existingTransactionalAccount
  );

  return updatedTransactionalAccount;
};



export const deleteTransactionalAccount = async (req, res) => {
  const transactionalAccountId = req.query.id;

  const transactionalAccountData = await transactionalAccountRepository.findOne({
    where: {
      id: transactionalAccountId,
      isDeleted: false,
    },
  });

  if (!transactionalAccountData) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  transactionalAccountData.isDeleted = true;
  await transactionalAccountRepository.save(transactionalAccountData);

  return transactionalAccountData;
};

export const getTransactionalAccount = async (req, res) => {
  const companyId = req.query.id;

  const transactionalAccount = await transactionalAccountRepository.find({
    where: {
      companyId,
      isDeleted: false,
    },
    order: {
      createdAt: "DESC",
    },
  });

  if (!transactionalAccount) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return transactionalAccount;
};
