import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const agentSchema = new Schema(
  {
    agentName: {
      type: String,
    },
    email: {
      type: String,
    },
    password: {
      type: String,
    },
    phoneNo: {
      type: String,
    },
    role: {
      type: String,
      default: "Agent",
    },
    status:{
      type: Boolean,
      default: true
    },
    address: {
      type: String,
    },
    isDeleted: {
      type: String,
      default: false,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

agentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);

  next();
});

agentSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

agentSchema.methods.generateAccessToken = function () {
  const payload = {
    _id: this._id,
    companyId: this.companyId,
    role: this.role,
    email: this.email,
    name: this.agentName,
  };

  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });
};

agentSchema.methods.generateRefreshToken = function () {
  const payload = {
    _id: this._id,
    companyId: this.companyId,
    role: this.role,
    email: this.email,
    name: this.agentName,
  };

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};

const Agent = mongoose.model("Agent", agentSchema);

export default Agent;
