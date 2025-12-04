import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import { VoucherCounter } from "../models/voucherCounter.model.js";
import CustomError from "../utils/exception.js";

export const uniqueVoucher = async (req, res) => {
  const { prefix } = req.query; // e.g., /generate-voucher?prefix=P

  if (!prefix) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    )
  }

  // Get the highest counter value across all prefixes
  const highestCounterDoc = await VoucherCounter.findOne().sort({ counter: -1 });
  const nextCounter = highestCounterDoc ? highestCounterDoc.counter + 1 : 1;

  // Check if this prefix already exists
  let counterDoc = await VoucherCounter.findOne({ prefix });

  if (!counterDoc) {
    // Create new document with the next global counter
    counterDoc = await VoucherCounter.create({ prefix, counter: nextCounter });
  } else {
    // Update existing document with the next global counter
    counterDoc.counter = nextCounter;
  await counterDoc.save();
  }

  const paddedCounter = String(counterDoc.counter).padStart(4, "0");
  const voucherNo = `${prefix}-${paddedCounter}`;

  return voucherNo
}