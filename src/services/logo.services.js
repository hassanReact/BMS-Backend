
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import AppDataSource from "../core/database/data-source.js";

const companyRepository = AppDataSource.getRepository("Company");


export const uploadLogo = async (req, res) => {
  
    const companyId = req.query.id;

    const company = await companyRepository.findOne({ where: { id: companyId } });
    const updatedCompany = company
      ? await companyRepository.save(Object.assign(company, {
          companyLogo: `uploads/${req.file.filename}`,
        }))
      : null;

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

  const company = await companyRepository.findOne({ where: { id: companyId } });

  if (!company) {
    throw new CustomError(
      statusCodes.notFound,
      Message.notFound,
      errorCodes.no_data_found
    );
  }

  return company.companyLogo;
};