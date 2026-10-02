
import readline from "readline";
import { config } from "dotenv";
import AppDataSource from "../src/core/database/data-source.js";
import { hashPassword } from "../src/services/user.services.js";

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

const createSuperAdmin = async (adminData) => {
  let superAdmin;

  await AppDataSource.transaction(async (transactionalEntityManager) => {
    const roleRepository = transactionalEntityManager.getRepository("Role");
    const userRoleRepository = transactionalEntityManager.getRepository("UserRole");
    const userRepository = transactionalEntityManager.getRepository("User");

    const superAdminRole = await roleRepository.findOne({
      where: { name: "SuperAdmin" },
    });

    if (!superAdminRole) {
      throw new Error(
        "SuperAdmin role not found. Please run the role seed first."
      );
    }

    const existingSuperAdminRole = await userRoleRepository.findOne({
      where: {
        roleId: superAdminRole.id,
        companyId: null,
        status: "active",
      },
      relations: { user: true },
    });

    if (existingSuperAdminRole) {
      throw new Error(
        "A SuperAdmin already exists. Only one SuperAdmin is allowed."
      );
    }

    const existingUser = await userRepository.findOne({
      where: { email: adminData.email },
    });

    if (existingUser) {
      throw new Error(
        `User with email ${adminData.email} already exists.`
      );
    }

    superAdmin = userRepository.create({
      fullname: adminData.fullname,
      email: adminData.email,
      password: await hashPassword(adminData.password),
      phoneNo: adminData.phoneNo,
      address: adminData.address,
    });
    await userRepository.save(superAdmin);

    const superAdminUserRole = userRoleRepository.create({
      userId: superAdmin.id,
      roleId: superAdminRole.id,
      companyId: null,
      status: "active",
    });
    await userRoleRepository.save(superAdminUserRole);

    console.log("\n SuperAdmin created successfully!");
  });

  console.log("Email:", superAdmin.email);
  console.log("Name:", superAdmin.fullname);
  console.log("Role: SuperAdmin");
  console.log("User ID:", superAdmin.id);
  console.log("Created:", superAdmin.createdAt);

  return superAdmin;
};

const setupSuperAdmin = async () => {
  try {
    console.log("SuperAdmin Setup Wizard");
    console.log("============================\n");

    await AppDataSource.initialize();

    console.log("Please provide the following information:\n");

    const fullname = await askQuestion("👤 Full Name: ");

    if (!fullname.trim()) {
      throw new Error("Full name is required");
    }

    let email;

    while (true) {
      email = await askQuestion("Email: ");

      email = email.trim().toLowerCase();

      if (!email) {
        console.log("Email is required");
        continue;
      }

      if (!isValidEmail(email)) {
        console.log("Please enter a valid email address");
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
        console.log("Password is required");
        continue;
      }

      if (!isValidPassword(password)) {
        console.log(
          "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number"
        );
        continue;
      }

      confirmPassword = await askQuestion(
        "Confirm Password: "
      );

      if (password !== confirmPassword) {
        console.log("Passwords do not match");
        continue;
      }

      break;
    }

    const phoneNo = await askQuestion(
      "📱 Phone Number (optional): "
    );

    const address = await askQuestion(
      "Address (optional): "
    );

    console.log("\n Please confirm the details:");
    console.log("================================");
    console.log(` Name: ${fullname.trim()}`);
    console.log(` Email: ${email}`);
    console.log(` Phone: ${phoneNo.trim() || "Not provided"}`);
    console.log(` Address: ${address.trim() || "Not provided"}`);
    console.log(` Role: SuperAdmin`);

    const confirm = await askQuestion(
      "\n Create SuperAdmin with these details? (Y/n): "
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

    console.log("\n Setup completed successfully!");
    console.log("You can now login with the created credentials.");
  } catch (error) {
    console.error("\n Setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};

process.on("SIGINT", async () => {
  console.log("\n\n Setup cancelled by user");

  rl.close();

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  process.exit(0);
});

setupSuperAdmin();