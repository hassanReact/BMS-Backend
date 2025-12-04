import * as block from '../services/block.services.js';
import { Message, statusCodes } from "../core/common/constant.js";
import { asyncHandler } from "../utils/asyncWrapper.js";
import CustomError from "../utils/exception.js";



export const createBlock = async(req, res, next) => {
  const Block = await block.createBlock(req, res, next);
  res.status(statusCodes?.created).send(Block);
};

export const editBlock = async(req, res, next) => {
  const Block = await block.editBlock(req, res, next);
  res.status(statusCodes?.created).send(Block);
};

export const getBlock = async(req, res, next) => {
  const Block = await block.getBlock(req, res, next);
  res.status(statusCodes?.created).send(Block);
};

export const deleteBlock = async(req, res, next) => {
  const Block = await block.deleteBlock(req, res, next);
  res.status(statusCodes?.created).send(Block);
};