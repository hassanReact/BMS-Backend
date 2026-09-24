import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import ExcelJS from 'exceljs';
import { FactorListInstance } from "twilio/lib/rest/verify/v2/service/entity/factor.js";
import AppDataSource from "../core/database/data-source.js";
import { hashPassword, comparePassword } from "./user.services.js";
import jwt from "jsonwebtoken";

const getRepository = (entityName) => AppDataSource.getRepository(entityName);


export const registerOwner = async (req, res) => {
  const {
    ownerName,
    email,
    password,
    phoneNo,
    address,
    companyId,
  } = req.body;

  let createdOwner;

  await AppDataSource.transaction(async (transactionalEntityManager) => {
    const roleRepository = transactionalEntityManager.getRepository("Role");
    const userRepository = transactionalEntityManager.getRepository("User");
    const userRoleRepository = transactionalEntityManager.getRepository("UserRole");
    const ownerRepository = transactionalEntityManager.getRepository("Owner");

      // 1. Find the Owner role
      const ownerRole = await roleRepository.findOne({ where: { name: "Owner" } });

      if (!ownerRole) {
        throw new CustomError(
          statusCodes?.notFound,
          "Owner role not found",
          errorCodes?.not_found
        );
      }

      // 2. Find existing User by email
      let user = await userRepository.findOne({
        where: { email: email.toLowerCase().trim(), isDeleted: false },
      });

      if (user){
        throw new CustomError(
          statusCodes?.conflict,
          Message?.alreadyExist,
          errorCodes?.already_exist
        );
      }

      // 3. If User doesn't exist, create the User
      if (!user) {
        user = userRepository.create({
          fullname: ownerName,
          email: email.toLowerCase().trim(),
          password: await hashPassword(password),
          phoneNo,
        });
        await userRepository.save(user);
      }

      // 5. Create UserRole
      const userRole = userRoleRepository.create({
        userId: user.id,
        roleId: ownerRole.id,
        companyId,
      });
      await userRoleRepository.save(userRole);

      // 7. Create Owner business profile
      createdOwner = ownerRepository.create({
        userId: user.id,
        ownerName,
        email: user.email,
        phoneNo,
        address,
        companyId,
      });
      await ownerRepository.save(createdOwner);
  });

    // 8. Return created Owner
    const result = await getRepository("Owner").findOne({ where: { id: createdOwner.id } });

   if(!result){
    throw new CustomError(
        statusCodes?.serviceUnavailable,
        Message?.serverError,
        errorCodes?.service_unavailable
      ); 
    }
    return result;

};

export const getOwnerById = async (req, res) => { 
  const ownerId = req.query.id;

  const property = await getRepository("Owner").findOne({ where: { id: ownerId } });
  if (!property) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  } 
  return property
};

export const getAllOwner = async (req) => {
  const companyId = req.query.id;
  if (!companyId) {
    throw new CustomError(
      statusCodes.badRequest,
      Message.missingId,
      errorCodes.missing_id
    );
  }

  const allOwner = await getRepository("Owner").find({
    where: { companyId, isDeleted: false },
    order: { createdAt: "DESC" },
  });

  if (!allOwner) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.serverError,
      errorCodes?.conflict,
    );
  }
  return allOwner;
};

export const getAllOwnerProperties = async (req, res) => {
  const ownerId = req.query.id;
  const properties = await getRepository("Booking").find({
    where: { isDeleted: false, ownerId },
    relations: { property: true, owner: true, company: true },
    order: { createdAt: "DESC" },
  });

  if (!properties) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return properties.map((booking) => {
    const { property, owner, company, ...bookingData } = booking;
    return {
      ...bookingData,
      propertyId: property,
      ownerId: owner,
      companyId: company,
    };
  });
};

export const getOwnerPropertyById = async (req, res) => {
  const { ownerId, propertyId } = req.query;

  if (!ownerId || !propertyId) {
    throw new CustomError(
      statusCodes.badRequest,
      Message.missingId,
      errorCodes.missing_id
    );
  }

  const property = await getRepository("Booking").findOne({
    where: { isDeleted: false, ownerId, propertyId },
    relations: { property: true, owner: true, company: true },
  });

  if (!property) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  if (!property) {
    return property;
  }
  const { property: propertyRecord, owner, company, ...bookingData } = property;
  return {
    ...bookingData,
    propertyId: propertyRecord,
    ownerId: owner,
    companyId: company,
  };
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const owner = await getRepository("Owner").findOne({ where: { id: userId } });
    const user = owner
      ? await getRepository("User").findOne({ where: { id: owner.userId } })
      : null;
    const userRole = user
      ? await getRepository("UserRole").findOne({
          where: { userId: user.id, status: "active" },
          relations: { role: true, company: true },
        })
      : null;
    const payload = {
      userId: user.id,
      email: user.email,
      role: userRole?.role?.name,
      roleId: userRole?.role?.id,
      companyId: userRole?.company?.id || null,
    };
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY });
    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY });

    user.refreshToken = refreshToken;
    await getRepository("User").save(user);
    return { accessToken, refreshToken };
  } catch (error) {
    throw new CustomError(
      statusCodes?.internalServerError,
      "Something went wrong while generating refresh and access tokens.",
      errorCodes?.server_error
    );
  }
};


export const getPropertyByOwnerId = async(req, res, next) => {
  const ownerId = req.query.id;
  const Properties = await getRepository("Property").find({
    where: { ownerId, isDeleted: false },
    relations: { type: true },
    order: { createdAt: "DESC" },
  });
  if (!Properties  ) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable,
    );
  }
    return Properties;
};

export const loginOwner = async (req, res) => {
  const { email, password } = req.body;

  const owner = await getRepository("Owner").findOne({ where: { email } });
  if (!owner) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const user = await getRepository("User").findOne({ where: { id: owner.userId } });
  const passwordVerify = await comparePassword(password, user.password);

  if (!passwordVerify) {
    throw new CustomError(
      statusCodes?.badRequest,
      Message?.inValid,
      errorCodes?.invalid_credentials
    );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    owner.id
  );

  const loginOwner = await getRepository("Owner").findOne({ where: { id: owner.id } });

  res.setHeader("token", accessToken);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return {
    accessToken,
    refreshToken,
    options,
    loginOwner,
  };
};

export const editOwner = async(req, res, next) => {
  const OwnerId = req.query.id;
  const updateData = req.body; 
  const ownerRepository = getRepository("Owner");
  const owner = await ownerRepository.findOne({ where: { id: OwnerId } });
  const editOwner = owner ? await ownerRepository.save(Object.assign(owner, updateData)) : null;

  if (!updateData) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable,
    );
  }
    return editOwner;
};

export const deleteOwner = async (req, res) => {
  const ownerId = req.query.id;

  const owner = await getRepository("Owner").findOne({ where: { id: ownerId } });
  if (!owner) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }

  owner.isDeleted = true;
  await getRepository("Owner").save(owner);
  return owner
};

export const bulkUploadOwner = async (req) => {
    const file = req?.file?.path;
    if (!file) {
      throw new CustomError(
        statusCodes?.badRequest,
        Message?.fileNotProvided,
        errorCodes?.file_missing
      );
    }

    const { companyId } = req.body;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    const worksheet = workbook.worksheets[0];

    const owners = [];
    const keysToCheck = ["ownerName", "email", "phoneNo", "address"];
    const createdOwner = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; 

      const owner = {
        ownerName: row.getCell(1)?.text?.trim() || '',
        email: row.getCell(2)?.text?.trim() || '',
        phoneNo: row.getCell(3)?.text?.trim() || '',
        address: row.getCell(4)?.text?.trim() || '',
        companyId
      }; 

      if (!keysToCheck.every((key) => owner[key])) {
        throw new CustomError(
          statusCodes.badRequest,
          Message?.rowMissing,
          errorCodes.invalid_format
        );
      }
      owners.push(owner);
    });

    for (const owner of owners) {
        const existingOwner = await getRepository("Owner").findOne({
          where: [
            { ownerName: owner.ownerName, isDeleted: false },
            { email: owner.email, isDeleted: false },
          ],
        });

        if (existingOwner) {
          continue;
        }


        const ownerRepository = getRepository("Owner");
        const newOwner = ownerRepository.create(owner);
        await ownerRepository.save(newOwner);
        if (!newOwner) {
          throw new CustomError(
            statusCodes.badRequest,
            Message.ownerMissing.
            errorCodes.not_created
          );
        }

        createdOwner.push(newOwner);

    }

    if (createdOwner.length === 0) {
      throw new CustomError(
        statusCodes.badRequest,
        Message.noNewOwner,
        errorCodes.not_created
      );
    }

    return createdOwner

};