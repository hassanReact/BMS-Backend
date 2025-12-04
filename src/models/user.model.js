import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    fullname: {
      type: String
    },
    email: {
      type: String
    },
    password: {
      type: String
    },
    phoneNo: {
      type: String
    },
    role: {
      type: String,
      enum: ["Staff", "Resident", "admin", "CompanyAdmin"],
      default: ""
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

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  const payload = {
    _id: this._id,
    email: this.email,
    role: this.role
  };

  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });
};

userSchema.methods.generateRefreshToken = function () {
  const payload = {
    _id: this._id,
    email: this.email,
    role: this.role
  };

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};

const User = mongoose.model("User", userSchema);

export default User;
