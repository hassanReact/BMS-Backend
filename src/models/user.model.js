import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    fullname: {
      type: String
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String
    },
    phoneNo: {
      type: String
    },
    address: {
      type: String
    },
    
    isDeleted: {
      type: String,
      default: false
    },
    refreshToken: {
      type: String
    },
  },
  { timestamps: true },
);



const User = mongoose.model("User", userSchema);

export default User;
