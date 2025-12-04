import * as typeServices from '../services/types.services.js'
import { statusCodes } from '../core/common/constant.js';



export const createType = async(req, res) => {
  const Data = await typeServices.createType(req, res);
  res.status(statusCodes?.created).send(Data);
};


export const getAllTypes = async(req, res) => {
  const Data = await typeServices.getAllTypes(req, res);
  res.status(statusCodes?.created).send(Data);
};

export const editTypes = async(req, res) => {
  const Data = await typeServices.editTypes(req, res);
  res.status(statusCodes?.created).send(Data);
};

export const deleteTypes = async(req, res) => {
  const Data = await typeServices.deleteTypes(req, res);
  res.status(statusCodes?.created).send(Data);
};
