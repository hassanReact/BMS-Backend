import Type from "../models/types.model.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";

export const createType = async (req, res) => {
  const { name, description, companyId } = req.body;

  const isTypeAlreadyExist = await Type.findOne({ name });

  if (isTypeAlreadyExist) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

    const newType = await Type.create({
      name,
      description,
      companyId, 
    });
  return newType;
};


export const getAllTypes = async (req, res) => {
    const companyId = req.query.id;

    const types = await Type.find({ companyId }).sort({ createdAt: -1 });

    if (!types ) {
      throw new CustomError(
          statusCodes?.notFound,
          Message?.notFound,
          errorCodes?.not_found
      );
    }
    return types;
}


  export const editTypes = async(req, res, next) => {
    const typeId = req.query.id;
    const updateData = req.body; 
    const updateType = await Type.findByIdAndUpdate(
      typeId,
      updateData,
      { new: true, runValidators: true } 
    ) 
  
    if (!updateType) {
      return new CustomError(
        statusCodes?.serviceUnavailable,
        Message?.serverError,
        errorCodes?.service_unavailable,
      );
    }
      return updateType;
  };

  export const deleteTypes = async(req, res, next) => {
    const typeId = req.query.id;
    const updateData = req.body; 
    const updateType = await Type.findByIdAndDelete(
      typeId,
      updateData,
      { new: true, runValidators: true } 
    ) 
  
    if (!updateType) {
      return new CustomError(
        statusCodes?.serviceUnavailable,
        Message?.serverError,
        errorCodes?.service_unavailable,
      );
    }
    return updateType;
  };