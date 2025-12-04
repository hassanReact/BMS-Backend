import { statusCodes } from "../core/common/constant.js";
import * as accountReceiveableServices from "../services/accountsReceiveables.services.js"

export const allReceives = async (req, res) => {
    const data = await accountReceiveableServices.getAllReceives(req, res);
    res.status(statusCodes.ok).send(data);
}

export const Vendors = async (req, res) => {
    const vendors = await accountReceiveableServices.vendors(req, res)
    res.status(statusCodes.ok).send(vendors);
}

export const property = async (req, res) => {
    const properties = await accountReceiveableServices.properties(req, res)
    res.status(statusCodes.ok).send(properties);
}

export const staff = async (req, res) => {
    const Staffs = await accountReceiveableServices.Staff(req, res)
    res.status(statusCodes.ok).send(Staffs);
}

export const Accounts = async (req, res) => {
    const Accounts = await accountReceiveableServices.TransactionalsAccount(req, res)
    res.status(statusCodes.ok).send(Accounts);
}

export const ServiceProvider = async (req, res) => {
    const ServiceProvider = await accountReceiveableServices.service(req, res)
    res.status(statusCodes.ok).send(ServiceProvider)
}

export const postVoucher = async (req, res) => {
    const voucher = await accountReceiveableServices.postVoucher(req, res)
    res.status(statusCodes.ok).send(voucher);
}

export const postBillVoucher = async (req, res) => {
    const voucher = await accountReceiveableServices.postBillVoucher(req, res);
    res.status(statusCodes.ok).send(voucher);
}