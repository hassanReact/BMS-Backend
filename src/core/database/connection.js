import mongoose from "mongoose";
// import User from '../../models/user.model.js';
import { database_urls } from "../common/constant.js";
import "dotenv/config";

const connectDB = async () => {
  try {
    (async function () {
      const dbUri = database_urls.connection;
      if (!dbUri) {
      throw new Error("Database URI is missing. Set DB_URI in .env");
    }
      await mongoose.connect(dbUri);
      console.log("✅ Database connected successfully");
      
      // if (connection) {
      //   const existingAdmin = await User.findOne({
      //     email: "admin@samyotech.com",
      //   });
      //   if (!existingAdmin) {
      //     const userData = new User({
      //       name: "Samyotech",
      //       gender: "Male",
      //       phoneNumber: "1234567890",
      //       email: "admin@samyotech.com",
      //       password: "1234",
      //       role: "admin"
      //     });
      //     await userData.save();
      //     console.log(`New Admin is Created`);
      //   }
      // }
    })()
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
