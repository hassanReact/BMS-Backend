import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const companySchema = new Schema(
  {
    companyName: {
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
      default:"companyAdmin"
    },
    status:{
      type: Boolean,
      default: true
    },
    address: {
      type: String
    },
    gstnumber: {
      type: String
    },
    currencyCode: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    smtpMail: {
      type: String,
    },
    smtpCode: {
      type: String,
    },
    isMailStatus:{
      type: Boolean,
      default: false
    },
    refreshToken: {
      type: String
    },
    subcriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription"
    },
    subcriptionBuyDate:{
      type: Date
    },
    whatappStatus:{
      type: Boolean,
      default: false
    },
    companyLogo:{
      type: String,
    },
  },
  { timestamps: true },
);

companySchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

companySchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

companySchema.methods.generateAccessToken = function () {
  const payload = {
    _id: this._id,
    companyId: this._id,
    role: this.role,
    email: this.email,
    name: this.companyName
  };

  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });
};

companySchema.methods.generateRefreshToken = function () {
  const payload = {
    _id: this._id,
    companyId: this._id,
    role: this.role,
    email: this.email,
    name: this.companyName
  };

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });

};

const Company = mongoose.model("Company", companySchema);

export default Company;
