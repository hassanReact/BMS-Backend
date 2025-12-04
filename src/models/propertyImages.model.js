import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const propertyImagesSchema = new Schema(
  {
    documentName: {
      type: String
    },
    url: {
      type: String
    },
    propertyId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property"
    },
  },
  { timestamps: true },
);


const PropertyImg = mongoose.model("PropertyImg", propertyImagesSchema);

export default PropertyImg;
