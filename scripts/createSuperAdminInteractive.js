import readline from 'readline';
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import connectDB from '../src/core/database/connection.js';

// Load environment variables
config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask questions
const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

// Function to ask for password (hidden input)
const askPassword = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
    rl.stdoutMuted = true;
  });
};

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

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const isValidPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Check if super admin already exists
const checkExistingSuperAdmin = async () => {
  const existingSuperAdmin = await User.findOne({ 
    role: 'admin',
    email: { $exists: true }
  });
  
  if (existingSuperAdmin) {
    console.log('\n⚠️  Warning: A super admin already exists in the system');
    console.log(`Email: ${existingSuperAdmin.email}`);
    console.log(`Created: ${existingSuperAdmin.createdAt}`);
    
    const proceed = await askQuestion('\nDo you want to create another super admin? (y/N): ');
    if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
      console.log('Operation cancelled.');
      return false;
    }
  }
  
  return true;
};

// Create super admin
const createSuperAdmin = async (adminData) => {
  try {
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: adminData.email });
    
    if (existingUser) {
      throw new Error(`User with email ${adminData.email} already exists`);
    }

    // Create new super admin
    const superAdmin = new User({
      fullname: adminData.fullname,
      email: adminData.email,
      password: adminData.password, // Will be hashed by the pre-save middleware
      phoneNo: adminData.phoneNo,
      role: 'admin',
      address: adminData.address
    });

    await superAdmin.save();
    
    console.log('\n✅ Super Admin created successfully!');
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

// Main setup function
const setupSuperAdmin = async () => {
  try {
    console.log('🚀 Super Admin Setup Wizard');
    console.log('================================\n');

    await connectDB();

    // Check if super admin already exists
    const canProceed = await checkExistingSuperAdmin();
    if (!canProceed) {
      process.exit(0);
    }

    console.log('Please provide the following information:\n');

    // Get admin details
    const fullname = await askQuestion('👤 Full Name: ');
    if (!fullname.trim()) {
      throw new Error('Full name is required');
    }

    let email;
    while (true) {
      email = await askQuestion('📧 Email: ');
      if (!email.trim()) {
        console.log('❌ Email is required');
        continue;
      }
      if (!isValidEmail(email)) {
        console.log('❌ Please enter a valid email address');
        continue;
      }
      break;
    }

    let password;
    let confirmPassword;
    while (true) {
      password = await askQuestion('🔐 Password (min 8 chars, 1 upper, 1 lower, 1 number): ');
      if (!password.trim()) {
        console.log('❌ Password is required');
        continue;
      }
      if (!isValidPassword(password)) {
        console.log('❌ Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number');
        continue;
      }
      
      confirmPassword = await askQuestion('🔐 Confirm Password: ');
      if (password !== confirmPassword) {
        console.log('❌ Passwords do not match');
        continue;
      }
      break;
    }

    const phoneNo = await askQuestion('📱 Phone Number (optional): ');
    const address = await askQuestion('🏠 Address (optional): ');

    // Confirm details
    console.log('\n📋 Please confirm the details:');
    console.log('================================');
    console.log(`👤 Name: ${fullname}`);
    console.log(`📧 Email: ${email}`);
    console.log(`📱 Phone: ${phoneNo || 'Not provided'}`);
    console.log(`🏠 Address: ${address || 'Not provided'}`);
    console.log(`🔐 Role: Super Admin`);

    const confirm = await askQuestion('\n✅ Create super admin with these details? (Y/n): ');
    if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'no') {
      console.log('Operation cancelled.');
      process.exit(0);
    }

    // Create super admin
    await createSuperAdmin({
      fullname: fullname.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      phoneNo: phoneNo.trim() || undefined,
      address: address.trim() || undefined
    });

    console.log('\n🎉 Setup completed successfully!');
    console.log('You can now login with the created credentials.');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    mongoose.disconnect();
  }
};

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Setup cancelled by user');
  rl.close();
  mongoose.disconnect();
  process.exit(0);
});

// Run the setup
setupSuperAdmin();