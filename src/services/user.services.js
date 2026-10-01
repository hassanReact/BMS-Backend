import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AppDataSource from "../core/database/data-source.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";

const getUserRepository = () => AppDataSource.getRepository("User");

const withoutSensitiveFields = ({ password, refreshToken, ...user }) => user;

export const hashPassword = async (password) => bcrypt.hash(password, 10);

// const generateAccessToken = (user) =>
//   jwt.sign(
//     {
//       _id: user.id,
//       email: user.email,
//       role: user.role,
//     },
//     process.env.ACCESS_TOKEN_SECRET,
//     { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
//   );

// const generateRefreshToken = (user) =>
//   jwt.sign(
//     {
  //     _id: user.id,
  //     email: user.email,
  //     role: user.role,
  //   },
  //   process.env.REFRESH_TOKEN_SECRET,
  //   { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  // );

export const registerUser = async (req) => {
  const { fullname, email, password, phoneNo, role, address } =
    req.body;

  const userRepository = getUserRepository();
  const normalizedEmail = email?.trim().toLowerCase();
  const isUserAlreadyExist = await userRepository.findOne({
    where: { email: normalizedEmail },
  });

  if (isUserAlreadyExist) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  const user = userRepository.create({
    fullname,
    email: normalizedEmail,
    password: await hashPassword(password),
    phoneNo,
    role,
    address
  });
  await userRepository.save(user);

  const createdUserRecord = await userRepository.findOne({
    where: { id: user.id },
  });
  const createdUser = createdUserRecord
    ? withoutSensitiveFields(createdUserRecord)
    : null;

  if (!createdUser) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }

  return createdUser;
};

export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// const generateAccessAndRefreshTokens = async (userId) => {
//   try {
//     const userRepository = getUserRepository();
//     const user = await userRepository.findOne({ where: { id: userId } });
//     const accessToken = generateAccessToken(user);
//     const refreshToken = generateRefreshToken(user);

//     user.refreshToken = refreshToken;
//     await userRepository.save(user);
//     return { accessToken, refreshToken };
//   } catch (error) {
//     throw new CustomError(
//       statusCodes?.internalServerError,
//       "Something went wrong while generating refresh and access tokens.",
//       errorCodes?.server_error
//     );
//   }
// };

// export const loginUser = async (req, res) => {
//   const { email, password } = req.body;

//   const userRepository = getUserRepository();
//   const user = await userRepository.findOne({
//     where: { email: email?.trim().toLowerCase() },
//   });
//   if (!user) {
//     throw new CustomError(
//       statusCodes?.notFound,
//       Message?.notFound,
//       errorCodes?.not_found
//     );
//   }

//   const passwordVerify = await bcrypt.compare(password, user.password);

//   if (!passwordVerify) {
//     throw new CustomError(
//       statusCodes?.badRequest,
//       Message?.inValid,
//       errorCodes?.invalid_credentials
//     );
//   }

//   const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
//     user.id
//   );

//   const loginUserRecord = await userRepository.findOne({
//     where: { id: user.id },
//   });
//   const loginUser = loginUserRecord
//     ? withoutSensitiveFields(loginUserRecord)
//     : null;

//   res.setHeader("token", accessToken);

//   const options = {
//     httpOnly: true,
//     secure: true,
//   };

//   return {
//     role: user.role,
//     accessToken,
//     refreshToken,
//     options,
//     loginUser,
//   };

  
// };
