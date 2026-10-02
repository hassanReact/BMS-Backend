
import AppDataSource from "../core/database/data-source.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";

const subscriptionRepository = AppDataSource.getRepository("Subscription");
const transactionRepository = AppDataSource.getRepository("Transaction");

export const createSubscription = async (req, res) => {

    const {
      title,
      noOfDays,
      amount,
      discount,
      discription
    } = req.body;

    const subscription = subscriptionRepository.create({
      title,
      noOfDays,
      amount,
      discount,
      discription
    });
    await subscriptionRepository.save(subscription);

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
    const subscription = await subscriptionRepository.findOne({ where: { id: SubscriptionId } });
    const updatedSubscription = subscription
      ? await subscriptionRepository.save(Object.assign(subscription, updateData))
      : null;

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

  const SubscriptionData = await subscriptionRepository.findOne({ where: { id: SubscriptionId } });
  if (!SubscriptionData) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  } 

  SubscriptionData.isDeleted = true;
  await subscriptionRepository.save(SubscriptionData);

  return SubscriptionData
};

export const getAllSubscriptions = async (req, res) => {

  const subscription = await subscriptionRepository.find({
    where: {
      isDeleted: false,
    },
    order: { createdAt: "DESC" },
  });

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
 
  const transaction = await transactionRepository.find({
    where: { companyId: companyId },
    relations: ["company", "subscription"],
    order: { createdAt: "DESC" },
  });

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


  const transaction = await transactionRepository.find({
    relations: ["company", "subscription"],
    order: { createdAt: "DESC" },
  });

  if (!transaction) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }

  return transaction;
};
