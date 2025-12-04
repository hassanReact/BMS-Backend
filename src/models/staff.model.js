import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const staffSchema = new Schema(
  {
    staffName: {
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
      default: "staff",
    },
    status: {
      type: Boolean,
      default: true
    },
    address: {
      type: String,
    },
    designation: {
      type: String,
      default: ""
    },
    Salary: {
      type: Number,
      default: 0
    },
    cnic: {
      type: String,
      default: ""
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    refreshToken: {
      type: String,
    },
    jobCompleted: [
      {
        complaintId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Complaint",
        },
        status: {
          type: Boolean,
          default: false,
        },
      }
    ],
  },
  { timestamps: true }
);

staffSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);

  next();
});

staffSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

staffSchema.methods.generateAccessToken = function () {
  const payload = {
    _id: this._id,
    companyId: this.companyId,
    role: this.role,
    email: this.email,
    name: this.staffName,
  };

  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
  });
};

staffSchema.methods.generateRefreshToken = function () {
  const payload = {
    _id: this._id,
    companyId: this.companyId,
    role: this.role,
    email: this.email,
    name: this.staffName,
  };

  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};

const staff = mongoose.model("Staff", staffSchema);

export default staff;
