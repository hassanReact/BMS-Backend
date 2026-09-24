import AppDataSource from "../core/database/data-source.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";

const typeRepository = AppDataSource.getRepository("Type");

export const createType = async (req, res) => {
  const { name, description, companyId } = req.body;

  const isTypeAlreadyExist = await typeRepository.findOne({ where: { name } });

  if (isTypeAlreadyExist) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

    const newType = typeRepository.create({
      name,
      description,
      companyId, 
    });
    await typeRepository.save(newType);
  return newType;
};


export const getAllTypes = async (req, res) => {
    const companyId = req.query.id;

    const types = await typeRepository.find({
      where: { companyId },
      order: { createdAt: "DESC" }
    });

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
    const type = await typeRepository.findOne({ where: { id: typeId } });
    const updateType = type
      ? await typeRepository.save(Object.assign(type, updateData))
      : null;
  
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
    const type = await typeRepository.findOne({ where: { id: typeId } });
    const updateType = type
      ? await typeRepository.remove(type)
      : null;
  
    if (!updateType) {
      return new CustomError(
        statusCodes?.serviceUnavailable,
        Message?.serverError,
        errorCodes?.service_unavailable,
      );
    }
    return updateType;
  };