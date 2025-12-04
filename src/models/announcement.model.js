import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const announcementSchema = new Schema(
  {
    topic: {
      type: String
    },
    details: {
      type: String
    },
    companyId: {
      type: String
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company"
    },
  },
  { timestamps: true },
);



const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement;
