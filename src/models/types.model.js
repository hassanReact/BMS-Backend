import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const typeSchema = new Schema(
  {
    name: {
      type: String
    },
    description: {
      type: String
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
  { timestamps: true },
);

const Type = mongoose.model("Type", typeSchema);
export default Type;

