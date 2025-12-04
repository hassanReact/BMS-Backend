import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const projectSchema = new Schema(
  {
    projectName : {
      type: String,
    },
    projectDetails: {
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


const project = mongoose.model("project", projectSchema);

export default project;
