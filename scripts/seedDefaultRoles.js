import mongoose from "mongoose";
import "dotenv/config";
import connectDB from "../src/core/database/connection.js";
import initializeRoles from "../src/core/database/initializeRoles.js";

const seedDefaultRoles = async () => {
  try {
    await connectDB();
    await initializeRoles();
    console.log("✅ Default roles seed completed successfully");
  } catch (error) {
    console.error("❌ Default roles seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedDefaultRoles();