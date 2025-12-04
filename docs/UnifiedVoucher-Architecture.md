# Unified Voucher System - Architecture Documentation

## Overview

The Unified Voucher System consolidates three separate accounting models (`AccountsPayable`, `AccountsReceivable`, and `AccountsVoucher`) into a single, efficient system that follows double-entry accounting principles. This consolidation eliminates data duplication, improves performance, and provides a consistent interface for all accounting operations.

## Architecture Benefits

### Before (3 Separate Models)
- ❌ **Data Duplication**: Same transaction data exists in multiple models
- ❌ **Inconsistent Structure**: Different field names and enums across models
- ❌ **Complex Queries**: Need to join multiple tables for simple reports
- ❌ **Maintenance Overhead**: Multiple models to maintain
- ❌ **Limited Reporting**: Hard to generate consolidated financial reports

### After (1 Unified Model)
- ✅ **Single Source of Truth**: All accounting data in one place
- ✅ **Consistent Structure**: Uniform field names and validation
- ✅ **Efficient Queries**: Single table for all accounting operations
- ✅ **Easy Maintenance**: One model to maintain and update
- ✅ **Rich Reporting**: Built-in methods for all common accounting reports

## Data Model

### Core Schema

```javascript
{
  voucherNo: String,           // Unique voucher identifier
  voucherType: String,         // AR, AP, REC, PAY, PUR, SAL, JV, CN, DN
  companyId: ObjectId,         // Company reference
  date: Date,                  // Transaction date
  month: String,               // Accounting period (YYYY-MM)
  particulars: String,         // Transaction description
  
  // Double-entry accounting
  debit: {
    accountId: ObjectId,       // Debit account reference
    accountType: String,       // Customer, Property, Vendor, etc.
    accountName: String        // Denormalized account name
  },
  credit: {
    accountId: ObjectId,       // Credit account reference
    accountType: String,       // Customer, Property, Vendor, etc.
    accountName: String        // Denormalized account name
  },
  
  amount: Number,              // Transaction amount
  paymentStatus: String,       // pending, partial, paid, overdue
  dueDate: Date,              // Due date for AR/AP
  propertyId: ObjectId,       // Property context (BMS specific)
  status: String,             // draft, pending, approved, rejected
  outstandingAmount: Number,   // Remaining amount for AR/AP
  linkedVouchers: Array,      // Related payment vouchers
  tags: Array                 // Categorization tags
}
```

### Voucher Types

| Type | Description | Use Case |
|------|-------------|----------|
| `AR` | Accounts Receivable | Customer owes money (maintenance, bills) |
| `AP` | Accounts Payable | We owe money (vendor payments, staff salaries) |
| `REC` | Receipt | Money received (customer payments) |
| `PAY` | Payment | Money paid (vendor payments) |
| `PUR` | Purchase | Purchase transactions |
| `SAL` | Sale/Service | Revenue from services |
| `JV` | Journal Voucher | Manual journal entries |
| `CN` | Credit Note | Refunds, adjustments |
| `DN` | Debit Note | Additional charges |

### Account Types

| Type | Description | Examples |
|------|-------------|----------|
| `Customer` | End customers | Property owners, tenants |
| `Property` | Real estate assets | Buildings, units |
| `Vendor` | Suppliers | Service providers, contractors |
| `Staff` | Employees | Maintenance staff, managers |
| `ServiceProvider` | External services | Security, cleaning |
| `Account` | General ledger accounts | Cash, bank, expenses |
| `Company` | Your company | Main business entity |

## API Endpoints

### Core Voucher Operations

```http
POST   /api/vouchers                    # Create voucher
GET    /api/vouchers                    # List vouchers with filters
GET    /api/vouchers/:id                # Get voucher by ID
PUT    /api/vouchers/:id                # Update voucher
DELETE /api/vouchers/:id                # Delete voucher (soft delete)
```

### Business Operations

```http
POST   /api/vouchers/maintenance-receivable  # Create maintenance AR
POST   /api/vouchers/vendor-payable          # Create vendor AP
POST   /api/vouchers/record-payment          # Record payment
```

### Workflow Operations

```http
PUT    /api/vouchers/:id/approve            # Approve voucher
PUT    /api/vouchers/:id/reject             # Reject voucher
```

### Reporting Endpoints

```http
GET    /api/vouchers/accounts-receivable     # Get AR with filters
GET    /api/vouchers/accounts-payable        # Get AP with filters
GET    /api/vouchers/ledger/:accountId/:type # Generate account ledger
GET    /api/vouchers/aging-report            # Generate aging report
GET    /api/vouchers/monthly-summary         # Monthly summary
GET    /api/vouchers/trial-balance           # Trial balance
GET    /api/vouchers/outstanding-balance/:id/:type # Account balance
```

## Usage Examples

### 1. Create Maintenance Receivable

```javascript
const receivableData = {
  companyId: '507f1f77bcf86cd799439011',
  customerId: '507f1f77bcf86cd799439012',
  customerName: 'John Doe',
  amount: 1500.00,
  propertyId: '507f1f77bcf86cd799439013',
  propertyName: 'Apartment 101',
  maintenanceId: '507f1f77bcf86cd799439014',
  month: '2024-01',
  dueDate: '2024-02-15'
};

const result = await voucherService.createMaintenanceReceivable(receivableData);
```

### 2. Record Payment Against Receivable

```javascript
const paymentData = {
  voucherId: '507f1f77bcf86cd799439015',
  paymentAmount: 1500.00,
  paymentDate: new Date(),
  paymentMethod: 'Bank Transfer'
};

const result = await voucherService.recordPayment(paymentData);
```

### 3. Generate Aging Report

```javascript
const agingReport = await voucherService.generateAgingReport(
  '507f1f77bcf86cd799439011', // companyId
  'AR'                         // voucherType
);
```

### 4. Get Outstanding Balance

```javascript
const balance = await voucherService.getOutstandingBalance(
  '507f1f77bcf86cd799439012', // accountId
  'Customer',                  // accountType
  '507f1f77bcf86cd799439011'  // companyId
);
```

## Migration Process

### Prerequisites

1. **Backup Database**: Always backup your database before migration
2. **Test Environment**: Test migration in development/staging first
3. **Downtime Planning**: Plan for minimal downtime during migration

### Migration Steps

1. **Deploy New Code**: Deploy the new UnifiedVoucher system
2. **Run Migration Script**: Execute the migration script
3. **Verify Data**: Confirm all data migrated correctly
4. **Update Application**: Switch application to use new system
5. **Remove Old Models**: Clean up old models after verification

### Running Migration

```bash
# Navigate to project directory
cd /path/to/your/project

# Run migration script
node src/scripts/runMigration.js <companyId>

# Example
node src/scripts/runMigration.js 507f1f77bcf86cd799439011
```

### Migration Script Features

- ✅ **Preview Mode**: Shows what will be migrated
- ✅ **Progress Tracking**: Real-time migration progress
- ✅ **Error Handling**: Detailed error reporting
- ✅ **Rollback Support**: Ability to undo migration
- ✅ **Validation**: Ensures data integrity

## Performance Optimization

### Database Indexes

```javascript
// Primary indexes for fast queries
{ companyId: 1, voucherType: 1, paymentStatus: 1 }
{ companyId: 1, date: -1 }
{ voucherNo: 1 }
{ propertyId: 1, month: 1 }

// Account-specific indexes
{ 'debit.accountId': 1 }
{ 'credit.accountId': 1 }

// Reporting indexes
{ companyId: 1, month: 1, voucherType: 1 }
```

### Query Optimization

- **Pagination**: Built-in pagination for large datasets
- **Selective Population**: Only populate required fields
- **Aggregation Pipelines**: Efficient for complex reports
- **Denormalization**: Account names stored for fast reporting

## Business Logic Examples

### Accounts Receivable Flow

```
1. Maintenance Work Created
   ↓
2. Create AR Voucher (Customer owes money)
   ↓
3. Customer Makes Payment
   ↓
4. Create Receipt Voucher (REC)
   ↓
5. Link & Update AR Voucher
   ↓
6. Outstanding Amount = 0 (Fully Paid)
```

### Accounts Payable Flow

```
1. Purchase Order Created
   ↓
2. Create AP Voucher (We owe money)
   ↓
3. Make Vendor Payment
   ↓
4. Create Payment Voucher (PAY)
   ↓
5. Link & Update AP Voucher
   ↓
6. Outstanding Amount = 0 (Fully Paid)
```

### Monthly Maintenance Generation

```
1. Property + Month Combination
   ↓
2. Generate AR for All Customers
   ↓
3. Track Individual Payments
   ↓
4. Generate Outstanding Reports
   ↓
5. Aging Analysis
```

## Validation Rules

### Required Fields

- `voucherType`: Must be valid voucher type
- `companyId`: Valid MongoDB ObjectId
- `particulars`: 3-500 characters
- `amount`: Positive number with 2 decimal places
- `debit.accountId` & `credit.accountId`: Valid ObjectIds
- `debit.accountType` & `credit.accountType`: Valid account types

### Business Rules

- **Double-Entry**: Debit and credit cannot be same account
- **Due Dates**: Required for AR and AP vouchers
- **Amount Validation**: Must be positive and properly formatted
- **Status Transitions**: Proper workflow state management

## Error Handling

### Service Layer Errors

```javascript
{
  success: false,
  error: "Error message",
  message: "User-friendly message"
}
```

### Common Error Scenarios

- **Validation Errors**: Invalid data format or business rules
- **Database Errors**: Connection or query failures
- **Business Logic Errors**: Invalid operations or state
- **Authentication Errors**: Unauthorized access

## Testing

### Unit Tests

- Model validation
- Service layer business logic
- Controller request handling
- Validation schemas

### Integration Tests

- API endpoint functionality
- Database operations
- Migration process
- Error scenarios

### Performance Tests

- Large dataset queries
- Concurrent operations
- Memory usage
- Response times

## Monitoring & Logging

### Key Metrics

- Voucher creation rate
- Payment processing time
- Report generation performance
- Error rates

### Logging

- All voucher operations
- Payment transactions
- System errors
- Performance metrics

## Security Considerations

### Authentication

- JWT-based authentication
- Company-level isolation
- Role-based access control

### Data Protection

- Input validation
- SQL injection prevention
- XSS protection
- Rate limiting

## Future Enhancements

### Planned Features

- **Multi-Currency Support**: Handle different currencies
- **Advanced Reporting**: Custom report builder
- **Audit Trail**: Complete transaction history
- **Integration APIs**: Third-party system integration
- **Mobile Support**: Mobile-optimized endpoints

### Scalability

- **Sharding**: Horizontal database scaling
- **Caching**: Redis-based caching layer
- **Microservices**: Service decomposition
- **Event Streaming**: Real-time updates

## Support & Maintenance

### Documentation

- API reference
- Integration guides
- Troubleshooting
- Best practices

### Updates

- Regular security patches
- Performance improvements
- New features
- Bug fixes

## Conclusion

The Unified Voucher System provides a robust, scalable, and maintainable solution for BMS accounting operations. By consolidating three separate models into one unified system, it eliminates data duplication, improves performance, and provides a consistent interface for all accounting operations.

The system follows double-entry accounting principles, supports all common voucher types, and includes built-in reporting capabilities. The migration process is designed to be safe and reversible, ensuring minimal risk during the transition.

For questions or support, please refer to the API documentation or contact the development team.
