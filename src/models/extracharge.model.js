import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const extraChargeSchema = new Schema(
  {
    serviceName : {
      type: String,
    },
    details: {
      type: String,
    },
    price: {
      type: String,
    },
    companyId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Company"
       },
       isDeleted: {
        type: Boolean,
        default: false
      },
  },
  { timestamps: true }
);


const ExtraCharge = mongoose.model("ExtraCharge", extraChargeSchema);

export default ExtraCharge;
