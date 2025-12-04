import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const tenantSchema = new Schema(
  {
    tenantName: {
      type: String
    },
    email: {
      type: String
    },
    password:{
      type: String
    },
    phoneno: {
      type: String
    },
    identityCardType: {
      type: String
    },
    identityNo: {
      type: String
    },
    // files:  {
    //   type: [String] 
    // },
    files: [
      {
        name:{type: String},
        filetype: { type: String },
        url: { type: String}
      },
    ],
    address:{
      type: String
    },
    role: {
      type: String,
      default:"tenant"
    },
    status:{
      type: Boolean,
      default: true
    },
    isDeleted:{
      type: Boolean,
      default: false
    },
    isOccupied: {
      type: Boolean,
      default: false
    },
    // accountName: {
    //   type: String
    // },
    companyId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    },  
    reporterId:{
      type: mongoose.Schema.Types.ObjectId
    },
  
  },
  { timestamps: true },
);

tenantSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

tenantSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

tenantSchema.methods.generateAccessToken = function () {
  const payload = {
    _id: this._id,
    email: this.email,
    role: this.role,
    companyId: this.companyId,
    name: this.tenantName,
    reporterId :this.reporterId
  };

  const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });
  return token;
};

tenantSchema.methods.generateRefreshToken = function () {
  const payload = {
    _id: this._id,
    email: this.email,
    role: this.role,
    companyId: this.companyId,
    name: this.tenantName,
    reporterId :this.reporterId
  };

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};


const Tenant = mongoose.model("Tenant", tenantSchema);

export default Tenant;
