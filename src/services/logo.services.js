
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import Company from "../models/company.model.js";


export const uploadLogo = async (req, res) => {
  
    const companyId = req.query.id;

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      {
        companyLogo: `uploads/${req.file.filename}`,
      },
      { new: true } 
    );

    if (!updatedCompany) {
      throw new CustomError(
        statusCodes.notFound,
        Message.notFound,
        errorCodes.no_data_found
      );    
    }

   return updatedCompany;
 
};

export const getUploadedLogo = async (req, res) => {
  const companyId = req.query.id;

  if (!companyId) {
    throw new CustomError(
      statusCodes.notFound,
      Message.notFound,
      errorCodes.no_data_found
    );
  }

  const company = await Company.findById(companyId);

  if (!company) {
    throw new CustomError(
      statusCodes.notFound,
      Message.notFound,
      errorCodes.no_data_found
    );
  }

  return company.companyLogo;
};