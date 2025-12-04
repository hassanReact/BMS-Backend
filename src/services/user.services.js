import User from "../models/user.model.js";
import { errorCodes, Message, statusCodes } from "../core/common/constant.js";
import CustomError from "../utils/exception.js";

export const registerUser = async (req) => {
  const { fullname, email, password, phoneNo, role, address } =
    req.body;

  const isUserAlreadyExist = await User.findOne({ email });

  if (isUserAlreadyExist) {
    throw new CustomError(
      statusCodes?.conflict,
      Message?.alreadyExist,
      errorCodes?.already_exist
    );
  }

  const user = await User.create({
    fullname,
    email,
    password,
    phoneNo,
    role,
    address
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    return new CustomError(
      statusCodes?.serviceUnavailable,
      Message?.serverError,
      errorCodes?.service_unavailable
    );
  }

  return createdUser;
};

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new CustomError(
      statusCodes?.internalServerError,
      "Something went wrong while generating refresh and access tokens.",
      errorCodes?.server_error
    );
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new CustomError(
      statusCodes?.notFound,
      Message?.notFound,
      errorCodes?.not_found
    );
  }

  const passwordVerify = await user.isPasswordCorrect(password);

  if (!passwordVerify) {
    throw new CustomError(
      statusCodes?.badRequest,
      Message?.inValid,
      errorCodes?.invalid_credentials
    );
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loginUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  res.setHeader("token", accessToken);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return {
    role: user.role,
    accessToken,
    refreshToken,
    options,
    loginUser,
  };

  
};
