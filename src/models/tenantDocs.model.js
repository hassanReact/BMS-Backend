import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const tenatnDocsSchema = new Schema(
  {
    documentName: {
      type: String
    },
    url: {
      type: String
    },
    tenantId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant"
    }
  },
  { timestamps: true },
);


const TenantDocs = mongoose.model("TenantDocs", tenatnDocsSchema);

export default TenantDocs;
