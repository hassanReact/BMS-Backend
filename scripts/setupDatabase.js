import mongoose from 'mongoose';
import User from '../src/models/user.model.js';
import Company from '../src/models/company.model.js';
import { config } from 'dotenv';
import readline from 'readline';
import connectDB from '../src/core/database/connection.js';

// Load environment variables
config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

// Database migration schema to track setup
const migrationSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  executedAt: { type: Date, default: Date.now },
  version: { type: String, required: true },
  description: { type: String }
});

const Migration = mongoose.model('Migration', migrationSchema);

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

// Check if migration already executed
const isMigrationExecuted = async (migrationName) => {
  const migration = await Migration.findOne({ name: migrationName });
  return !!migration;
};

// Record migration execution
const recordMigration = async (migrationName, version, description) => {
  const migration = new Migration({
    name: migrationName,
    version,
    description
  });
  await migration.save();
};

// Create default super admin
// const createDefaultSuperAdmin = async () => {
//   const migrationName = 'create_default_super_admin';
  
//   if (await isMigrationExecuted(migrationName)) {
//     console.log('✅ Default super admin migration already executed');
//     return;
//   }

//   console.log('🔧 Running migration: Create Default Super Admin');

//   try {
//     // Check if any admin exists
//     const existingAdmin = await User.findOne({ role: 'admin' });
    
//     if (existingAdmin) {
//       console.log('⚠️  Super admin already exists, skipping default creation');
//       await recordMigration(migrationName, '1.0.0', 'Super admin already exists, skipped creation');
//       return;
//     }

//     // Create default super admin with secure random credentials
//     const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@company.com';
//     const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || generateSecurePassword();

//     const superAdmin = new User({
//       fullname: 'System Administrator',
//       email: defaultEmail,
//       password: defaultPassword,
//       role: 'admin',
//       phoneNo: process.env.DEFAULT_ADMIN_PHONE || undefined
//     });

//     await superAdmin.save();
    
//     console.log('✅ Default super admin created successfully!');
//     console.log('📧 Email:', defaultEmail);
//     console.log('🔐 Password:', defaultPassword);
//     console.log('⚠️  IMPORTANT: Change the default password after first login!');

//     await recordMigration(migrationName, '1.0.0', 'Created default super admin');
//   } catch (error) {
//     console.error('❌ Migration failed:', error.message);
//     throw error;
//   }
// };

// Generate secure random password
// const generateSecurePassword = () => {
//   const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
//   let password = '';
  
//   // Ensure at least one of each required character type
//   password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
//   password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase  
//   password += '0123456789'[Math.floor(Math.random() * 10)]; // number
//   password += '@#$%&*'[Math.floor(Math.random() * 6)]; // special char
  
//   // Fill remaining positions
//   for (let i = 4; i < 12; i++) {
//     password += chars[Math.floor(Math.random() * chars.length)];
//   }
  
//   // Shuffle the password
//   return password.split('').sort(() => Math.random() - 0.5).join('');
// };

// Setup database indexes
const setupDatabaseIndexes = async () => {
  const migrationName = 'setup_database_indexes';
  
  if (await isMigrationExecuted(migrationName)) {
    console.log('✅ Database indexes migration already executed');
    return;
  }

  console.log('🔧 Running migration: Setup Database Indexes');

  try {
    // Create indexes for User model
    await User.collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ isDeleted: 1 });
    await User.collection.createIndex({ createdAt: -1 });

    // Create indexes for Company model
    await Company.collection.createIndex({ email: 1 }, { unique: true, sparse: true });
    await Company.collection.createIndex({ companyName: 1 });
    await Company.collection.createIndex({ isDeleted: 1 });
    await Company.collection.createIndex({ status: 1 });

    console.log('✅ Database indexes created successfully');
    await recordMigration(migrationName, '1.0.0', 'Created database indexes for performance optimization');
  } catch (error) {
    console.error('❌ Index creation failed:', error.message);
    // Don't throw error for index creation as it might already exist
  }
};

// Initialize default settings
const initializeDefaultSettings = async () => {
  const migrationName = 'initialize_default_settings';
  
  if (await isMigrationExecuted(migrationName)) {
    console.log('✅ Default settings migration already executed');
    return;
  }

  console.log('🔧 Running migration: Initialize Default Settings');

  try {
    // You can add default settings initialization here
    // For example, creating default property types, etc.
    
    console.log('✅ Default settings initialized');
    await recordMigration(migrationName, '1.0.0', 'Initialized default system settings');
  } catch (error) {
    console.error('❌ Default settings initialization failed:', error.message);
    throw error;
  }
};

// Main setup function
const setupDatabase = async () => {
  try {
    console.log('🚀 Database Setup and Migration Tool');
    console.log('=====================================\n');

    await connectDB();

    console.log('Running database migrations...\n');

    // Run migrations in order
    await setupDatabaseIndexes();
    await initializeDefaultSettings();
    await createDefaultSuperAdmin();

    console.log('\n🎉 Database setup completed successfully!');
    
    // Show completed migrations
    const migrations = await Migration.find().sort({ executedAt: -1 });
    console.log('\n📋 Completed migrations:');
    console.log('========================');
    migrations.forEach(migration => {
      console.log(`✅ ${migration.name} (v${migration.version}) - ${migration.executedAt.toISOString()}`);
      if (migration.description) {
        console.log(`   ${migration.description}`);
      }
    });

  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    mongoose.disconnect();
  }
};

// Interactive setup for development
const interactiveSetup = async () => {
  try {
    console.log('🔧 Interactive Database Setup');
    console.log('=============================\n');

    const runMigrations = await askQuestion('Run database migrations? (Y/n): ');
    if (runMigrations.toLowerCase() !== 'n') {
      await setupDatabase();
    }

    const createAdmin = await askQuestion('\nCreate custom super admin? (y/N): ');
    if (createAdmin.toLowerCase() === 'y' || createAdmin.toLowerCase() === 'yes') {
      console.log('Please run: npm run create-admin:interactive');
    }

  } catch (error) {
    console.error('\n❌ Interactive setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
};

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--interactive') || args.includes('-i')) {
  interactiveSetup();
} else {
  setupDatabase();
}