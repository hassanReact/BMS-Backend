
import readline from "readline";
import mongoose from "mongoose";

import User from "../src/models/user.model.js";
import UserRole from "../src/models/userRole.model.js";
import Role from "../src/models/role.model.js";

import { config } from "dotenv";
import connectDB from "../src/core/database/connection.js";

config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password) => {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

  return passwordRegex.test(password);
};

const checkExistingSuperAdmin = async (superAdminRoleId) => {
  const existingSuperAdminRole = await UserRole.findOne({
    roleId: superAdminRoleId,
    companyId: null,
    Status: "active",
  }).populate("userId");

  if (existingSuperAdminRole) {
    throw new Error(
      `A SuperAdmin already exists: ${existingSuperAdminRole.userId.email}`
    );
  }
};

const createSuperAdmin = async (adminData) => {
  const session = await mongoose.startSession();

  try {
    let superAdmin;

    await session.withTransaction(async () => {

      // 1. Find SuperAdmin role
      const superAdminRole = await Role.findOne({
        name: "SuperAdmin",
      }).session(session);

      if (!superAdminRole) {
        throw new Error(
          "SuperAdmin role not found. Please run the role seed first."
        );
      }

      // 2. Only ONE SuperAdmin is allowed
      const existingSuperAdminRole = await UserRole.findOne({
        roleId: superAdminRole._id,
        companyId: null,
        Status: "active",
      }).session(session);

      if (existingSuperAdminRole) {
        throw new Error(
          "A SuperAdmin already exists. Only one SuperAdmin is allowed."
        );
      }

      // 3. Email must be unique
      const existingUser = await User.findOne({
        email: adminData.email,
      }).session(session);

      if (existingUser) {
        throw new Error(
          `User with email ${adminData.email} already exists.`
        );
      }

      // 4. Create User
      const users = await User.create(
        [
          {
            fullname: adminData.fullname,
            email: adminData.email,
            password: adminData.password,
            phoneNo: adminData.phoneNo,
            address: adminData.address,
          },
        ],
        { session }
      );

      superAdmin = users[0];

      // 5. Create SuperAdmin UserRole
      await UserRole.create(
        [
          {
            userId: superAdmin._id,
            roleId: superAdminRole._id,
            companyId: null,
            Status: "active",
          },
        ],
        { session }
      );
    });

    console.log("\n✅ SuperAdmin created successfully!");
    console.log("📧 Email:", superAdmin.email);
    console.log("👤 Name:", superAdmin.fullname);
    console.log("🔐 Role: SuperAdmin");
    console.log("🆔 User ID:", superAdmin._id);
    console.log("📅 Created:", superAdmin.createdAt);

    return superAdmin;

  } finally {
    await session.endSession();
  }
};

const setupSuperAdmin = async () => {
  try {
    console.log("🚀 SuperAdmin Setup Wizard");
    console.log("============================\n");

    await connectDB();

    console.log("Please provide the following information:\n");

    const fullname = await askQuestion("👤 Full Name: ");

    if (!fullname.trim()) {
      throw new Error("Full name is required");
    }

    let email;

    while (true) {
      email = await askQuestion("📧 Email: ");

      email = email.trim().toLowerCase();

      if (!email) {
        console.log("❌ Email is required");
        continue;
      }

      if (!isValidEmail(email)) {
        console.log("❌ Please enter a valid email address");
        continue;
      }

      break;
    }

    let password;
    let confirmPassword;

    while (true) {
      password = await askQuestion(
        "🔐 Password (min 8 chars, 1 upper, 1 lower, 1 number): "
      );

      if (!password.trim()) {
        console.log("❌ Password is required");
        continue;
      }

      if (!isValidPassword(password)) {
        console.log(
          "❌ Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number"
        );
        continue;
      }

      confirmPassword = await askQuestion(
        "🔐 Confirm Password: "
      );

      if (password !== confirmPassword) {
        console.log("❌ Passwords do not match");
        continue;
      }

      break;
    }

    const phoneNo = await askQuestion(
      "📱 Phone Number (optional): "
    );

    const address = await askQuestion(
      "🏠 Address (optional): "
    );

    console.log("\n📋 Please confirm the details:");
    console.log("================================");
    console.log(`👤 Name: ${fullname.trim()}`);
    console.log(`📧 Email: ${email}`);
    console.log(`📱 Phone: ${phoneNo.trim() || "Not provided"}`);
    console.log(`🏠 Address: ${address.trim() || "Not provided"}`);
    console.log(`🔐 Role: SuperAdmin`);

    const confirm = await askQuestion(
      "\n✅ Create SuperAdmin with these details? (Y/n): "
    );

    if (
      confirm.trim().toLowerCase() === "n" ||
      confirm.trim().toLowerCase() === "no"
    ) {
      console.log("Operation cancelled.");
      return;
    }

    await createSuperAdmin({
      fullname: fullname.trim(),
      email,
      password,
      phoneNo: phoneNo.trim() || undefined,
      address: address.trim() || undefined,
    });

    console.log("\n🎉 Setup completed successfully!");
    console.log("You can now login with the created credentials.");

  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    process.exitCode = 1;

  } finally {
    rl.close();
    await mongoose.disconnect();
  }
};

process.on("SIGINT", async () => {
  console.log("\n\n👋 Setup cancelled by user");

  rl.close();
  await mongoose.disconnect();

  process.exit(0);
});

setupSuperAdmin();