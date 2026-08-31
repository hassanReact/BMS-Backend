import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import userRole from '../src/models/userRole.model.js';
import Role from '../src/models/role.model.js';
import { config } from 'dotenv';
import connectDB from '../src/core/database/connection.js';

// // Load environment variables
// config();

// // Connect to database
// // const connectDB = async () => {
// //   try {
// //     await mongoose.connect(`${process.env.DB_URI}`);
// //     console.log('✅ Database connected successfully');
// //   } catch (error) {
// //     console.error('❌ Database connection failed:', error.message);
// //     process.exit(1);
// //   }
// // };

// // Create super admin from environment variables
// const createSuperAdminFromEnv = async () => {
//   try {
//     // Get admin details from environment variables
//     const adminData = {
//       fullname: process.env.SUPER_ADMIN_NAME || 'Super Administrator',
//       email: process.env.SUPER_ADMIN_EMAIL,
//       password: process.env.SUPER_ADMIN_PASSWORD,
//       phoneNo: process.env.SUPER_ADMIN_PHONE || undefined,
//       address: process.env.SUPER_ADMIN_ADDRESS || undefined
//     };

//     // Validate required fields
//     if (!adminData.email || !adminData.password) {
//       throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables are required');
//     }

//     // Validate email format
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(adminData.email)) {
//       throw new Error('Invalid email format in SUPER_ADMIN_EMAIL');
//     }

//     // Validate password strength
//     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
//     if (!passwordRegex.test(adminData.password)) {
//       throw new Error('SUPER_ADMIN_PASSWORD must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number');
//     }

//     // Check if user with this email already exists
//     const existingUser = await User.findOne({ email: adminData.email });
    
//     if (existingUser) {
//       console.log(`⚠️  User with email ${adminData.email} already exists`);
//       if (existingUser.role === 'admin') {
//         console.log('✅ Super admin already exists, skipping creation');
//         return existingUser;
//       } else {
//         throw new Error(`User with email ${adminData.email} exists but is not a super admin`);
//       }
//     }

//     // Create new super admin
//     const superAdmin = new User({
//       fullname: adminData.fullname,
//       email: adminData.email.toLowerCase(),
//       password: adminData.password, // Will be hashed by the pre-save middleware
//       phoneNo: adminData.phoneNo,
//       role: 'admin',
//       address: adminData.address
//     });

//     await superAdmin.save();
    
//     console.log('✅ Super Admin created successfully!');
//     console.log('📧 Email:', superAdmin.email);
//     console.log('👤 Name:', superAdmin.fullname);
//     console.log('🔐 Role:', superAdmin.role);
//     console.log('📅 Created:', superAdmin.createdAt);
    
//     return superAdmin;
//   } catch (error) {
//     console.error('❌ Error creating super admin:', error.message);
//     throw error;
//   }
// };

// // Main function
// const main = async () => {
//   try {
//     console.log('🚀 Creating Super Admin...');
//     console.log('========================\n');

//     await connectDB();
//     await createSuperAdminFromEnv();

//     console.log('\n🎉 Super admin setup completed successfully!');
//   } catch (error) {
//     console.error('\n❌ Setup failed:', error.message);
//     process.exit(1);
//   } finally {
//     mongoose.disconnect();
//   }
// };


// main();


config();

const createSuperAdminFromEnv = async () => {
  const session = await mongoose.startSession();

  try {
    let superAdmin;

    await session.withTransaction(async () => {

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

      const superAdminRole = await Role.findOne({
        name: "SuperAdmin",
      }).session(session);

      if (!superAdminRole) {
        throw new Error(
          "SuperAdmin role not found. Run role seed first."
        );
      }

      // -----------------------------------------
      // 3. Make sure another SuperAdmin
      //    does not already exist
      // -----------------------------------------

      const existingSuperAdminRole = await userRole.findOne({
        roleId: superAdminRole._id,
        companyId: null,
        Status: "active",
      })
        .session(session);

      if (existingSuperAdminRole) {
        const existingSuperAdmin = await User.findById(
          existingSuperAdminRole.userId
        ).session(session);

        console.log(
          `⚠️ SuperAdmin already exists: ${existingSuperAdmin?.email || "unknown"}`
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

      const existingUser = await User.findOne({
        email: adminData.email,
      }).session(session);

      if (existingUser) {
        throw new Error(
          `User with email ${adminData.email} already exists. Cannot use this email for SuperAdmin.`
        );
      }

      // -----------------------------------------
      // 5. Create User
      // -----------------------------------------

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

      // -----------------------------------------
      // 6. Create UserRole
      // -----------------------------------------

      await userRole.create(
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

      console.log("✅ SuperAdmin created successfully!");
    });

    console.log("Email:", superAdmin.email);
    console.log("Name:", superAdmin.fullname);
    console.log("Role: SuperAdmin");
    console.log("User ID:", superAdmin._id);
    console.log("Created:", superAdmin.createdAt);

    return superAdmin;

  } finally {
    await session.endSession();
  }
};

const main = async () => {
  try {
    console.log("🚀 Creating SuperAdmin...");
    console.log("==========================\n");

    await connectDB();

    await createSuperAdminFromEnv();

    console.log("\n🎉 SuperAdmin setup completed successfully!");
  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

main();