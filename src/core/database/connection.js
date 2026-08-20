import mongoose from "mongoose";
// import User from '../../models/user.model.js';
import { database_urls } from "../common/constant.js";
import "dotenv/config";

const connectDB = async () => {
  try {
      const dbUri = database_urls.connection;
      if (!dbUri) {
        throw new Error("Database URI is missing. Set DB_URI in .env");
      }
      await mongoose.connect(dbUri);
      console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
