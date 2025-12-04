import * as billServices from "../services/bill.services.js"
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";

export const createbill = async (req, res, next) => {
  const billData = await billServices.createbill(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const getAllBill = async (req, res, next) => {
  const billData = await billServices.getAllBill(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const getMonthlyBillData = async (req, res, next) => {
  const billData = await billServices.getMonthlyBillData(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const getBillSummaryBetweenDates = async (req, res, next) => {
  const billData = await billServices.getBillSummaryBetweenDates(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const totalYearlySales = async (req, res, next) => {
  const billData = await billServices.getTotalSalesForYear(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const totalPaidBills = async (req, res, next) => {
  const billData = await billServices.totalPaidBills(req, res);
  res.status(statusCodes?.created).send(billData);
};
export const totalPendingBills = async (req, res, next) => {
  const billData = await billServices.totalPendingBills(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const getMonthlyPaidForTenant = async (req, res, next) => {
  const billData = await billServices.getMonthlyPaidForTenant(req, res);
  res.status(statusCodes?.created).send(billData);
};


export const getTotalSales = async (req, res, next) => {
  const billData = await billServices.getTotalSalesForMonth(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const getBillByBookingId = async (req, res, next) => {
  const billData = await billServices.getBillByBookingId(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const getBillByCreaterBy = async (req, res, next) => {
  const billData = await billServices.getBillByCreaterBy(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const getMonthlyPaidBillsForAgent = async (req, res, next) => {
  const billData = await billServices.getMonthlyPaidBillsForAgent(req, res);
  res.status(statusCodes?.created).send(billData);
};


export const getAllUnpaidBillForAgent = async (req, res, next) => {
  const billData = await billServices.getAllUnpaidBillForAgent(req, res);
  res.status(statusCodes?.created).send(billData);
};
export const changeBillStatus = async (req, res, next) => {
  const billData = await billServices.changeBillStatus(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const reporterDetails = async (req, res, next) => {
  const billData = await billServices.reporterDetails(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const getBillForT = async (req, res, next) => {
  const billData = await billServices.getBillByT(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const getBillForTPending = async (req, res, next) => {
  const billData = await billServices.getBillForTPending(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const getBillById = async (req, res, next) => {
  const billData = await billServices.getBillById(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const deleteBill = async (req, res, next) => {
  const billData = await billServices.deleteBill(req, res);
  res.status(statusCodes?.created).send(billData);
};

export const updateBill = async (req, res, next) => {
  const billData = await billServices.updateBillVoucher(req, res);
  res.status(statusCodes?.success || 200).send(billData);
}

export const bulkUploadWaterBills = async (req, res, next) => {
  const billData = await billServices.bulkUploadWaterBills(req);
  res.status(statusCodes?.created).send(billData);
};



export const billVoucher = async (req, res, next) => {
  const billData = await billServices.billVoucher(req, res);
  res.status(statusCodes?.created).send(billData);
};
