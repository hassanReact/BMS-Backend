import { config } from 'dotenv';
import AppDataSource from '../src/core/database/data-source.js';
import { hashPassword } from '../src/services/user.services.js';

config();

const createSuperAdminFromEnv = async () => {
  let superAdmin;

  await AppDataSource.transaction(async (transactionalEntityManager) => {
    const roleRepository = transactionalEntityManager.getRepository("Role");
    const userRoleRepository = transactionalEntityManager.getRepository("UserRole");
    const userRepository = transactionalEntityManager.getRepository("User");

    const email = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
    const password = process.env.SUPER_ADMIN_PASSWORD;

    const adminData = {
      fullname:
        process.env.SUPER_ADMIN_NAME || "Super Administrator",
      email,
      password,
      phoneNo: process.env.SUPER_ADMIN_PHONE || undefined,
      address: process.env.SUPER_ADMIN_ADDRESS || undefined,
    };

    // -----------------------------------------
    // 1. Validate environment variables
    // -----------------------------------------

    if (!adminData.email || !adminData.password) {
      throw new Error(
        "SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables are required"
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(adminData.email)) {
      throw new Error(
        "Invalid email format in SUPER_ADMIN_EMAIL"
      );
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(adminData.password)) {
      throw new Error(
        "SUPER_ADMIN_PASSWORD must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number"
      );
    }

    // -----------------------------------------
    // 2. Find SuperAdmin role
    // -----------------------------------------

    const superAdminRole = await roleRepository.findOne({
      where: { name: "SuperAdmin" },
    });

    if (!superAdminRole) {
      throw new Error(
        "SuperAdmin role not found. Run role seed first."
      );
    }

    // -----------------------------------------
    // 3. Make sure another SuperAdmin
    //    does not already exist
    // -----------------------------------------

    const existingSuperAdminRole = await userRoleRepository.findOne({
      where: {
        roleId: superAdminRole.id,
        companyId: null,
        status: "active",
      },
      relations: { user: true },
    });

    if (existingSuperAdminRole) {
      const existingSuperAdmin = existingSuperAdminRole.user;

      console.log(
        `SuperAdmin already exists: ${existingSuperAdmin?.email || "unknown"}`
      );

      // If the requested email belongs to the same user,
      // simply skip.
      if (
        existingSuperAdmin &&
        existingSuperAdmin.email === adminData.email
      ) {
        superAdmin = existingSuperAdmin;
        return;
      }

      throw new Error(
        "A SuperAdmin already exists. Only one SuperAdmin is allowed."
      );
    }

    // -----------------------------------------
    // 4. Check email uniqueness
    // -----------------------------------------

    const existingUser = await userRepository.findOne({
      where: { email: adminData.email },
    });

    if (existingUser) {
      throw new Error(
        `User with email ${adminData.email} already exists. Cannot use this email for SuperAdmin.`
      );
    }

    // -----------------------------------------
    // 5. Create User
    // -----------------------------------------

    superAdmin = userRepository.create({
      fullname: adminData.fullname,
      email: adminData.email,
      password: await hashPassword(adminData.password),
      phoneNo: adminData.phoneNo,
      address: adminData.address,
    });
    await userRepository.save(superAdmin);

    // -----------------------------------------
    // 6. Create UserRole
    // -----------------------------------------

    const superAdminUserRole = userRoleRepository.create({
      userId: superAdmin.id,
      roleId: superAdminRole.id,
      companyId: null,
      status: "active",
    });
    await userRoleRepository.save(superAdminUserRole);

    console.log("SuperAdmin created successfully!");
  });

  console.log("Email:", superAdmin.email);
  console.log("Name:", superAdmin.fullname);
  console.log("Role: SuperAdmin");
  console.log("User ID:", superAdmin.id);
  console.log("Created:", superAdmin.createdAt);

  return superAdmin;
};

const main = async () => {
  try {
    console.log("Creating SuperAdmin...");
    console.log("==========================\n");

    await AppDataSource.initialize();

    await createSuperAdminFromEnv();

    console.log("\n SuperAdmin setup completed successfully!");
  } catch (error) {
    console.error("\n Setup failed:", error.message);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};

main();