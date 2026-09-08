import Owner from "../models/owner.model.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";
import Property from '../models/property.model.js'
import Company from "../models/company.model.js";
import ExcelJS from 'exceljs';
import { FactorListInstance } from "twilio/lib/rest/verify/v2/service/entity/factor.js";
import Booking from "../models/booking,model.js";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import UserRole from "../models/userRole.model.js";
import mongoose from "mongoose";


export const registerOwner = async (req, res) => {
  const {
    ownerName,
    email,
    password,
    phoneNo,
    address,
    companyId,
  } = req.body;

  const session = await mongoose.startSession();

  try {
    let createdOwner;
    

    await session.withTransaction(async () => {

      // 1. Find the Owner role
      const ownerRole = await Role.findOne({
        name: "Owner",
      }).session(session);

      if (!ownerRole) {
        throw new CustomError(
          statusCodes?.notFound,
          "Owner role not found",
          errorCodes?.not_found
        );
      }

      // 2. Find existing User by email
      let user = await User.findOne({
        email: email.toLowerCase().trim(),
        isDeleted: false,
      }).session(session);

      if (user){
        throw new CustomError(
          statusCodes?.conflict,
          Message?.alreadyExist,
          errorCodes?.already_exist
        );
      }

      // 3. If User doesn't exist, create the User
      if (user) {
        const createdUsers = await User.create(
          [
            {
              fullname: ownerName,
              email: email.toLowerCase().trim(),
              password,
              phoneNo,
            },
          ],
          { session }
        );

        user = createdUsers[0];
      }

      // 5. Create UserRole
      await UserRole.create(
        [
          {
            userId: user._id,
            roleId: ownerRole._id,
            companyId,
          },
        ],
        { session }
      );

      // 7. Create Owner business profile
      const owner = await Owner.create(
        [
          {
            userId: user._id,
            ownerName,
            email: user.email,
            phoneNo,
            address,
            companyId,
          },
        ],
        { session }
      );

      createdOwner = owner[0];
    });

    // 8. Return created Owner
    const result = await Owner.findById(createdOwner._id).select(
      "-password -refreshToken"
    );

   if(!result){
    throw new CustomError(
        statusCodes?.serviceUnavailable,
        Message?.serverError,
        errorCodes?.service_unavailable
      ); 
    }
    return result;

  } finally {
    await session.endSession();
  }
};

export const getOwnerById = async (req, res) => { 
  const ownerId = req.query.id;

  const property = await Owner.findById(ownerId);
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

  const allOwner = await Owner.find({companyId:companyId, isDeleted: false}).sort({ createdAt: -1 });

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
  const properties = await Booking.find({ isDeleted: false, ownerId })
    .populate('propertyId')
    .populate('ownerId')
    .populate('companyId')
    .sort({ createdAt: -1 });

  if (!properties) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return properties;
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

  const property = await Booking.findOne({ 
    isDeleted: false, 
    ownerId, 
    propertyId 
  })
    .populate('propertyId')
    .populate('ownerId')
    .populate('companyId');

  if (!property) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  return property;
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const owner = await Owner.findById(userId);
    const accessToken = owner.generateAccessToken();
    const refreshToken = owner.generateRefreshToken();

    owner.refreshToken = refreshToken;
    await owner.save({ validateBeforeSave: false });
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
  const Properties = await Property.find({ ownerId, isDeleted: false })
  .populate('typeId')
  .sort({ createdAt: -1 });
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

  const owner = await Owner.findOne({ email });
  if (!owner) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const passwordVerify = await owner.isPasswordCorrect(password);

  if (!passwordVerify) {
    throw new CustomError(
      statusCodes?.badRequest,
      Message?.inValid,
      errorCodes?.invalid_credentials
    );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    owner._id
  );

  const loginOwner = await Owner.findById(owner._id).select(
    "-password -refreshToken"
  );

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
  const editOwner = await Owner.findByIdAndUpdate(
    OwnerId,
    updateData,
    { new: true, runValidators: true } 
  ) 

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

  const owner = await Owner.findById(ownerId);
  if (!owner) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound ,
      errorCodes?.not_found
    );
  }

  owner.isDeleted = true;
  await owner.save();
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
        const existingOwner = await Owner.findOne({
          $or: [
            { ownerName: owner.ownerName, isDeleted: false },
            { email: owner.email, isDeleted: false }
          ]
        });

        if (existingOwner) {
          continue;
        }


        const newOwner = await Owner.create(owner);
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