
import  Subscription from "../models/subscription.model.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import Transaction from "../models/transaction.model.js";

export const createSubscription = async (req, res) => {

    const {
      title,
      noOfDays,
      amount,
      discount,
      discription
    } = req.body;

    const subscription = await Subscription.create({
      title,
      noOfDays,
      amount,
      discount,
      discription
    });

    if (!subscription) {
      throw new CustomError(
        statusCodes?.conflict,
        Message?.alreadyExist ,
        errorCodes?.already_exist
      );
    }

    return subscription;
};


export const editSubscriptions = async (req, res) => {
    const SubscriptionId = req.query.id;

    if (!SubscriptionId) {
      throw new CustomError(
        statusCodes?.badRequest,
        Message?.missingId ,
        errorCodes?.missingId
      );
    }

    const {
      title,
      noOfDays,
      amount,
      discount,
      discription
    } = req.body;

    const updateData = {
      title,
      noOfDays,
      amount,
      discount,
      discription
    };
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      SubscriptionId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedSubscription) {
      throw new CustomError(
        statusCodes?.notFound,
        Message?.notFound ,
        errorCodes?.not_found
      );
    }

    return updatedSubscription;
  
};



export const deleteSubscriptions = async (req, res) => {
  const SubscriptionId = req.query.id;

  const SubscriptionData = await Subscription.findById(SubscriptionId);
  if (!SubscriptionData) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  } 

  SubscriptionData.isDeleted = true;
  await SubscriptionData.save();

  return SubscriptionData
};

export const getAllSubscriptions = async (req, res) => {

  const subscription = await Subscription.find({
    isDeleted: false,
  }).sort({ createdAt: -1 });

  if (!subscription) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }
  return subscription;
};

export const getSubTransaction = async (req, res) => {

  const companyId = req.query.id;
 
  const transaction = await Transaction.find({companyId:companyId})
  .populate("companyId")
  .populate("subscriptionId")
  .sort({ createdAt: -1 });

  if (!transaction) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }
  return transaction;
};

export const getAllSubTransaction = async (req, res) => {


  const transaction = await Transaction.find()
  .populate("companyId")
  .populate("subscriptionId")
  .sort({ createdAt: -1 });

  if (!transaction) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }

  return transaction;
};
