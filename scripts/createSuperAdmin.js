import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import { config } from 'dotenv';
import connectDB from '../src/core/database/connection.js';

// Load environment variables
config();

// Connect to database
// const connectDB = async () => {
//   try {
//     await mongoose.connect(`${process.env.DB_URI}`);
//     console.log('✅ Database connected successfully');
//   } catch (error) {
//     console.error('❌ Database connection failed:', error.message);
//     process.exit(1);
//   }
// };

// Create super admin from environment variables
const createSuperAdminFromEnv = async () => {
  try {
    // Get admin details from environment variables
    const adminData = {
      fullname: process.env.SUPER_ADMIN_NAME || 'Super Administrator',
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
      phoneNo: process.env.SUPER_ADMIN_PHONE || undefined,
      address: process.env.SUPER_ADMIN_ADDRESS || undefined
    };

    // Validate required fields
    if (!adminData.email || !adminData.password) {
      throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminData.email)) {
      throw new Error('Invalid email format in SUPER_ADMIN_EMAIL');
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(adminData.password)) {
      throw new Error('SUPER_ADMIN_PASSWORD must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number');
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: adminData.email });
    
    if (existingUser) {
      console.log(`⚠️  User with email ${adminData.email} already exists`);
      if (existingUser.role === 'admin') {
        console.log('✅ Super admin already exists, skipping creation');
        return existingUser;
      } else {
        throw new Error(`User with email ${adminData.email} exists but is not a super admin`);
      }
    }

    // Create new super admin
    const superAdmin = new User({
      fullname: adminData.fullname,
      email: adminData.email.toLowerCase(),
      password: adminData.password, // Will be hashed by the pre-save middleware
      phoneNo: adminData.phoneNo,
      role: 'admin',
      address: adminData.address
    });

    await superAdmin.save();
    
    console.log('✅ Super Admin created successfully!');
    console.log('📧 Email:', superAdmin.email);
    console.log('👤 Name:', superAdmin.fullname);
    console.log('🔐 Role:', superAdmin.role);
    console.log('📅 Created:', superAdmin.createdAt);
    
    return superAdmin;
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    console.log('🚀 Creating Super Admin...');
    console.log('========================\n');

    await connectDB();
    await createSuperAdminFromEnv();

    console.log('\n🎉 Super admin setup completed successfully!');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    mongoose.disconnect();
  }
};


main();