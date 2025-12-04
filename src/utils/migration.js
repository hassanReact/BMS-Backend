import mongoose from 'mongoose';
import AccountsPayable from '../models/accountsPayable.model.js';
import AccountsReceivable from '../models/accountsReceiveable.model.js';
import AccountsVoucher from '../models/accountsVoucher.model.js';
import UnifiedVoucher from '../models/UnifiedVoucher.model.js';

/**
 * Migration script to consolidate three accounting models into UnifiedVoucher
 * Run this script after creating the new UnifiedVoucher model
 */

class AccountingMigration {
  constructor() {
    this.migrationLog = [];
    this.errors = [];
  }

  /**
   * Main migration function
   */
  async migrateAll(companyId) {
    try {
      console.log('🚀 Starting Accounting Module Migration...');
      
      // Step 1: Migrate Accounts Receivable
      await this.migrateAccountsReceivable(companyId);
      
      // Step 2: Migrate Accounts Payable
      await this.migrateAccountsPayable(companyId);
      
      // Step 3: Migrate existing Vouchers
      await this.migrateExistingVouchers(companyId);
      
      // Step 4: Generate migration report
      this.generateMigrationReport();
      
      console.log('✅ Migration completed successfully!');
      return { success: true, log: this.migrationLog, errors: this.errors };
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.errors.push({ step: 'Migration', error: error.message });
      return { success: false, log: this.migrationLog, errors: this.errors };
    }
  }

  /**
   * Migrate Accounts Receivable to UnifiedVoucher
   */
  async migrateAccountsReceivable(companyId) {
    try {
      console.log('📥 Migrating Accounts Receivable...');
      
      const arRecords = await AccountsReceivable.find({ 
        companyId, 
        isDeleted: false 
      }).populate('propertyId');
      
      let migratedCount = 0;
      
      for (const ar of arRecords) {
        try {
          // Create AR voucher
          const voucherData = {
            voucherNo: `AR-${ar._id.toString().slice(-6)}`,
            voucherType: 'AR',
            sourceDocument: {
              referenceId: ar.referenceId,
              referenceModel: ar.referenceModel
            },
            companyId: ar.companyId,
            date: ar.createdAt,
            month: ar.month,
            particulars: `${ar.type} - ${ar.propertyName || 'Property'}`,
            debit: {
              accountId: ar.referenceId,
              accountType: this.mapAccountType(ar.referenceModel),
              accountName: ar.type
            },
            credit: {
              accountId: ar.companyId,
              accountType: 'Company',
              accountName: 'Company'
            },
            amount: ar.amount,
            paymentStatus: ar.status === 'Pending' ? 'pending' : 'paid',
            dueDate: this.calculateDueDate(ar.createdAt),
            propertyId: ar.propertyId?._id,
            propertyName: ar.propertyName,
            status: 'approved',
            outstandingAmount: ar.status === 'Pending' ? ar.amount : 0,
            tags: [ar.type, 'Migration']
          };
          
          await UnifiedVoucher.create(voucherData);
          migratedCount++;
          
          this.migrationLog.push({
            type: 'AR',
            originalId: ar._id,
            newVoucherNo: voucherData.voucherNo,
            status: 'success'
          });
          
        } catch (error) {
          this.errors.push({
            type: 'AR',
            originalId: ar._id,
            error: error.message
          });
        }
      }
      
      console.log(`✅ Migrated ${migratedCount} AR records`);
      this.migrationLog.push({
        step: 'Accounts Receivable Migration',
        count: migratedCount,
        status: 'completed'
      });
      
    } catch (error) {
      throw new Error(`AR Migration failed: ${error.message}`);
    }
  }

  /**
   * Migrate Accounts Payable to UnifiedVoucher
   */
  async migrateAccountsPayable(companyId) {
    try {
      console.log('📤 Migrating Accounts Payable...');
      
      const apRecords = await AccountsPayable.find({ 
        companyId, 
        isDeleted: false 
      });
      
      let migratedCount = 0;
      
      for (const ap of apRecords) {
        try {
          // Create AP voucher
          const voucherData = {
            voucherNo: `AP-${ap._id.toString().slice(-6)}`,
            voucherType: 'AP',
            sourceDocument: {
              referenceId: ap.referenceId,
              referenceModel: ap.referenceModel
            },
            companyId: ap.companyId,
            date: ap.createdAt,
            month: ap.month,
            particulars: `${ap.type} - ${ap.referenceModel}`,
            debit: {
              accountId: ap.companyId,
              accountType: 'Company',
              accountName: 'Company'
            },
            credit: {
              accountId: ap.referenceId,
              accountType: this.mapAccountType(ap.referenceModel),
              accountName: ap.type
            },
            amount: ap.amount,
            paymentStatus: ap.status === 'pending' ? 'pending' : 'paid',
            dueDate: this.calculateDueDate(ap.createdAt),
            status: ap.status === 'approved' ? 'approved' : 'pending',
            outstandingAmount: ap.status === 'pending' ? ap.amount : 0,
            tags: [ap.type, 'Migration']
          };
          
          await UnifiedVoucher.create(voucherData);
          migratedCount++;
          
          this.migrationLog.push({
            type: 'AP',
            originalId: ap._id,
            newVoucherNo: voucherData.voucherNo,
            status: 'success'
          });
          
        } catch (error) {
          this.errors.push({
            type: 'AP',
            originalId: ap._id,
            error: error.message
          });
        }
      }
      
      console.log(`✅ Migrated ${migratedCount} AP records`);
      this.migrationLog.push({
        step: 'Accounts Payable Migration',
        count: migratedCount,
        status: 'completed'
      });
      
    } catch (error) {
      throw new Error(`AP Migration failed: ${error.message}`);
    }
  }

  /**
   * Migrate existing Vouchers to UnifiedVoucher
   */
  async migrateExistingVouchers(companyId) {
    try {
      console.log('📋 Migrating existing Vouchers...');
      
      const existingVouchers = await AccountsVoucher.find({ 
        companyId, 
        isDeleted: false 
      });
      
      let migratedCount = 0;
      
      for (const voucher of existingVouchers) {
        try {
          // Map voucher type
          const newVoucherType = this.mapVoucherType(voucher.voucherType);
          
          // Create unified voucher
          const voucherData = {
            voucherNo: voucher.voucherNo,
            voucherType: newVoucherType,
            sourceDocument: {
              referenceId: voucher.referenceId,
              referenceModel: voucher.models
            },
            companyId: voucher.companyId,
            date: voucher.date,
            month: new Date(voucher.date).toISOString().slice(0, 7),
            particulars: voucher.particulars,
            debit: {
              accountId: voucher.debit.referenceId,
              accountType: voucher.debit.referenceModel,
              accountName: voucher.debit.referenceModel
            },
            credit: {
              accountId: voucher.credit.referenceId,
              accountType: voucher.credit.referenceModel,
              accountName: voucher.credit.referenceModel
            },
            amount: voucher.amount,
            paymentStatus: newVoucherType === 'JV' ? 'paid' : 'pending',
            status: voucher.status,
            approvedAt: voucher.approvedAt,
            details: voucher.details,
            tags: ['Migration', 'Existing Voucher']
          };
          
          await UnifiedVoucher.create(voucherData);
          migratedCount++;
          
          this.migrationLog.push({
            type: 'Voucher',
            originalId: voucher._id,
            newVoucherNo: voucherData.voucherNo,
            status: 'success'
          });
          
        } catch (error) {
          this.errors.push({
            type: 'Voucher',
            originalId: voucher._id,
            error: error.message
          });
        }
      }
      
      console.log(`✅ Migrated ${migratedCount} existing vouchers`);
      this.migrationLog.push({
        step: 'Existing Vouchers Migration',
        count: migratedCount,
        status: 'completed'
      });
      
    } catch (error) {
      throw new Error(`Voucher Migration failed: ${error.message}`);
    }
  }

  /**
   * Map account types from old models to new unified system
   */
  mapAccountType(oldType) {
    const mapping = {
      'Maintenance': 'Customer',
      'Bill': 'Customer',
      'PurchaseDetails': 'Vendor',
      'staff': 'Staff',
      'ServiceProvider': 'ServiceProvider',
      'Property': 'Property',
      'Customer': 'Customer',
      'Vendor': 'Vendor'
    };
    
    return mapping[oldType] || 'Account';
  }

  /**
   * Map voucher types from old system to new unified system
   */
  mapVoucherType(oldType) {
    const mapping = {
      'AP': 'AP',
      'PUR': 'PUR',
      'VCH': 'JV',
      'SAL': 'SAL',
      'REC': 'REC',
      'PAY': 'PAY'
    };
    
    return mapping[oldType] || 'JV';
  }

  /**
   * Calculate due date (30 days from creation for migration)
   */
  calculateDueDate(createdAt) {
    const dueDate = new Date(createdAt);
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate;
  }

  /**
   * Generate migration report
   */
  generateMigrationReport() {
    console.log('\n📊 Migration Report:');
    console.log('==================');
    
    this.migrationLog.forEach(log => {
      if (log.step) {
        console.log(`${log.step}: ${log.count} records`);
      }
    });
    
    if (this.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${this.errors.length}`);
      this.errors.forEach(error => {
        console.log(`- ${error.type}: ${error.error}`);
      });
    }
    
    console.log('\n🎯 Migration completed!');
  }

  /**
   * Rollback migration (if needed)
   */
  async rollback(companyId) {
    try {
      console.log('🔄 Rolling back migration...');
      
      const deletedCount = await UnifiedVoucher.deleteMany({
        companyId,
        tags: { $in: ['Migration'] }
      });
      
      console.log(`✅ Rolled back ${deletedCount.deletedCount} migrated records`);
      return { success: true, deletedCount: deletedCount.deletedCount };
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default AccountingMigration;
