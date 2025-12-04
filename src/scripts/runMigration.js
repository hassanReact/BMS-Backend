#!/usr/bin/env node

/**
 * Migration Runner Script
 * 
 * This script runs the accounting module migration to consolidate
 * three separate models into one unified voucher system.
 * 
 * Usage:
 * node src/scripts/runMigration.js <companyId>
 * 
 * Example:
 * node src/scripts/runMigration.js 507f1f77bcf86cd799439011
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AccountingMigration from '../utils/migration.js';

// Load environment variables
dotenv.config();

class MigrationRunner {
  constructor() {
    this.migration = new AccountingMigration();
  }

  /**
   * Connect to MongoDB
   */
  async connectToDatabase() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bms';
      
      console.log('🔌 Connecting to MongoDB...');
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
      console.log('✅ Connected to MongoDB successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      return false;
    }
  }

  /**
   * Validate company ID
   */
  validateCompanyId(companyId) {
    if (!companyId) {
      console.error('❌ Company ID is required');
      console.log('Usage: node src/scripts/runMigration.js <companyId>');
      return false;
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      console.error('❌ Invalid Company ID format');
      return false;
    }

    return true;
  }

  /**
   * Show migration preview
   */
  async showMigrationPreview(companyId) {
    try {
      console.log('\n📊 Migration Preview:');
      console.log('=====================');
      
      // Import models for preview
      const AccountsPayable = mongoose.model('AccountsPayable');
      const AccountsReceivable = mongoose.model('AccountsReceivable');
      const AccountsVoucher = mongoose.model('AccountVoucher');
      
      // Count records
      const [apCount, arCount, voucherCount] = await Promise.all([
        AccountsPayable.countDocuments({ companyId, isDeleted: false }),
        AccountsReceivable.countDocuments({ companyId, isDeleted: false }),
        AccountsVoucher.countDocuments({ companyId, isDeleted: false })
      ]);
      
      console.log(`📤 Accounts Payable: ${apCount} records`);
      console.log(`📥 Accounts Receivable: ${arCount} records`);
      console.log(`📋 Existing Vouchers: ${voucherCount} records`);
      console.log(`📊 Total to migrate: ${apCount + arCount + voucherCount} records`);
      
      return { apCount, arCount, voucherCount };
    } catch (error) {
      console.error('❌ Failed to get migration preview:', error.message);
      return null;
    }
  }

  /**
   * Confirm migration
   */
  async confirmMigration() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('\n⚠️  Are you sure you want to proceed with the migration? (yes/no): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * Run the migration
   */
  async runMigration(companyId) {
    try {
      console.log('\n🚀 Starting migration process...');
      console.log('================================');
      
      const result = await this.migration.migrateAll(companyId);
      
      if (result.success) {
        console.log('\n🎉 Migration completed successfully!');
        console.log('=====================================');
        
        // Show summary
        if (result.log && result.log.length > 0) {
          console.log('\n📋 Migration Summary:');
          result.log.forEach(log => {
            if (log.step) {
              console.log(`✅ ${log.step}: ${log.count} records`);
            }
          });
        }
        
        // Show errors if any
        if (result.errors && result.errors.length > 0) {
          console.log(`\n⚠️  Errors encountered: ${result.errors.length}`);
          result.errors.forEach(error => {
            console.log(`- ${error.type}: ${error.error}`);
          });
        }
        
        return true;
      } else {
        console.error('\n❌ Migration failed!');
        if (result.errors && result.errors.length > 0) {
          console.log('\nError details:');
          result.errors.forEach(error => {
            console.log(`- ${error.step}: ${error.error}`);
          });
        }
        return false;
      }
    } catch (error) {
      console.error('\n❌ Migration failed with error:', error.message);
      return false;
    }
  }

  /**
   * Main execution method
   */
  async execute() {
    try {
      // Get company ID from command line arguments
      const companyId = process.argv[2];
      
      if (!this.validateCompanyId(companyId)) {
        process.exit(1);
      }
      
      console.log('🏢 Company ID:', companyId);
      
      // Connect to database
      const connected = await this.connectToDatabase();
      if (!connected) {
        process.exit(1);
      }
      
      // Show migration preview
      const preview = await this.showMigrationPreview(companyId);
      if (!preview) {
        process.exit(1);
      }
      
      // Confirm migration
      const confirmed = await this.confirmMigration();
      if (!confirmed) {
        console.log('\n❌ Migration cancelled by user');
        process.exit(0);
      }
      
      // Run migration
      const success = await this.runMigration(companyId);
      
      if (success) {
        console.log('\n🎯 Migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Update your application to use the new UnifiedVoucher model');
        console.log('2. Test the new API endpoints');
        console.log('3. Remove old models after confirming everything works');
        console.log('4. Update frontend to use new unified voucher system');
      } else {
        console.log('\n❌ Migration failed. Please check the errors above.');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('\n❌ Unexpected error:', error.message);
      process.exit(1);
    } finally {
      // Close database connection
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
      }
      process.exit(0);
    }
  }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new MigrationRunner();
  runner.execute();
}

export default MigrationRunner;
