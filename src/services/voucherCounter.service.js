import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import AppDataSource from "../core/database/data-source.js";
import CustomError from "../utils/exception.js";

const voucherCounterRepository = AppDataSource.getRepository("VoucherCounter");

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
  const highestCounterDoc = await voucherCounterRepository.findOne({
    order: { counter: "DESC" }
  });
  const nextCounter = highestCounterDoc ? highestCounterDoc.counter + 1 : 1;

  // Check if this prefix already exists
  let counterDoc = await voucherCounterRepository.findOne({
    where: { prefix }
  });

  if (!counterDoc) {
    // Create new document with the next global counter
    counterDoc = voucherCounterRepository.create({ prefix, counter: nextCounter });
    await voucherCounterRepository.save(counterDoc);
  } else {
    // Update existing document with the next global counter
    counterDoc.counter = nextCounter;
    await voucherCounterRepository.save(counterDoc);
  }

  const paddedCounter = String(counterDoc.counter).padStart(4, "0");
  const voucherNo = `${prefix}-${paddedCounter}`;

  return voucherNo
}