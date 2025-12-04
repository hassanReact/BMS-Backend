// import * as Subscription from '../services/Subscription.services.js
import * as subscription from '../services/subscription.servises.js';
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";



export const createSubscription = async(req, res, next) => {
  const Subscription = await subscription.createSubscription(req, res, next);
  res.status(statusCodes?.created).send(Subscription);
};

export const editSubscriptions = async(req, res, next) => {
  const Subscription = await subscription.editSubscriptions(req, res, next);
  res.status(statusCodes?.created).send(Subscription);
};

export const getAllSubscriptions = async(req, res, next) => {
  const Subscription = await subscription.getAllSubscriptions(req, res, next);
  res.status(statusCodes?.created).send(Subscription);
};

export const deleteSubscriptions = async(req, res, next) => {
  const Subscription = await subscription.deleteSubscriptions(req, res, next);
  res.status(statusCodes?.created).send(Subscription);
};

export const getSubTransaction = async(req, res, next) => {
  const Subscription = await subscription.getSubTransaction(req, res, next);
  res.status(statusCodes?.created).send(Subscription);
};


export const getAllSubTransaction = async(req, res, next) => {
  const Subscription = await subscription.getAllSubTransaction(req, res, next);
  res.status(statusCodes?.created).send(Subscription);
};