import { asyncHandler } from "../utils/asyncWrapper.js";
import Transaction from "../models/transaction.model.js";
import CustomError from "../utils/exception.js";
import { statusCodes, errorCodes, Message } from "../core/common/constant.js";

export const  transaction = asyncHandler(async (req, res, next) => {
  try {
    const {
      companyId,
      SubscriptionId,
      amount,
      discount ,
      currency
    } = req.body;

    if (!companyId || !SubscriptionId ) {
      throw new CustomError(
        statusCodes.badRequest,
        Message.missing_field,
        errorCodes.validation_error
      );
    }

    const newTransaction = new Transaction({
      companyId,
      subscriptionId:SubscriptionId,
      amount: amount.toString(),
      discount: discount.toString(),
      currency,
    });

    await newTransaction.save();

    req.transaction = newTransaction;

    next();
  } catch (error) {
    console.error('Transaction middleware error:', error.message);
    throw new CustomError(
      statusCodes.serviceUnavailable,
      Message.serverError,
      errorCodes.service_unavailable
    );
  }
});
