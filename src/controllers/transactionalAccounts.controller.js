import * as transactionalAccount from '../services/transactionalAccounts.services.js';
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";



export const createTransactionalAccount = async(req, res, next) => {
  const TransactionalAccounts = await transactionalAccount.createTransactionalAccount(req, res, next);
  res.status(statusCodes?.created).send(TransactionalAccounts);
};

export const getTransactionalAccountById = async (req, res, next) => {
  const TransactionalAccounts = await transactionalAccount.getTransactionalAccountById(req, res, next);
  res.status(statusCodes.ok).send(TransactionalAccounts);
};

export const editTransactionalAccount = async(req, res, next) => {
  const TransactionalAccounts = await transactionalAccount.editTransactionalAccount(req, res, next);
  res.status(statusCodes?.created).send(TransactionalAccounts);
};

export const getTransactionalAccount = async(req, res, next) => {
  const TransactionalAccounts = await transactionalAccount.getTransactionalAccount(req, res, next);
  res.status(statusCodes?.created).send(TransactionalAccounts);
};

export const deleteTransactionalAccount = async(req, res, next) => {
  const TransactionalAccounts = await transactionalAccount.deleteTransactionalAccount(req, res, next);
  res.status(statusCodes?.created).send(TransactionalAccounts);
};