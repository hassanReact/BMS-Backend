import * as accountsPayable from '../services/accountsPayable.services.js';
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";

export const createAccountsPayable = async(req, res, next) => {
    const AccountsPayable = await accountsPayable.postVoucherForVendor(req, res, next);
    res.status(statusCodes?.created).send(AccountsPayable);
}

export const editAccountsPayable = async(req, res, next) => {
    const AccountsPayable = await accountsPayable.editAccountsPayable(req, res, next);
    res.status(statusCodes?.created).send(AccountsPayable);
}

export const getAccountsPayable = async(req, res, next) => {
    const AccountsPayable = await accountsPayable.getAccountsPayable(req, res, next);
    res.status(statusCodes?.created).send(AccountsPayable);
}

export const getAccountsPayableById = async (req, res, next) => {
  const AccountsPayable = await accountsPayable.getAccountsPayableById(req, res, next);
  res.status(statusCodes.ok).send(AccountsPayable);
};

export const deleteAccountsPayable = async(req, res, next) => {
    const AccountsPayable = await accountsPayable.deleteAccountsPayable(req, res, next);
    res.status(statusCodes?.created).send(AccountsPayable);
}

export const postVoucherForVendor = async (req, res) =>{
    const voucher = await accountsPayable.postVoucherForVendor(req, res);
    res.status(statusCodes.ok).send(voucher)
}

export const postVoucherForPurchase = async (req, res) =>{
    const voucher = await accountsPayable.postVoucherForPurchase(req, res);
    res.status(statusCodes.ok).send(voucher)
}

export const postVoucherForServiceProvider = async (req, res) =>{
    const voucher = await accountsPayable.postVoucherForServiceProvider(req, res);
    res.status(statusCodes.ok).send(voucher)
}