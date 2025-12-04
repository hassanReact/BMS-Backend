# Bulk Water Bills API Documentation

## Overview
The Bulk Water Bills API allows you to upload multiple water bills at once using an Excel file. Each water bill will automatically create both a Bill record and a corresponding UnifiedVoucher for accounting purposes.

## Endpoint
```
POST /api/v1/bill/bulkUploadWaterBills
```

## Request Format
- **Content-Type**: `multipart/form-data`
- **File Field**: `file` (Excel file .xls or .xlsx)

## Request Body (Form Data)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Excel file containing water bill data |
| `companyId` | String | Yes | Company ID |
| `createdBy` | String | Yes | User ID who created the bills |
| `billingMonth` | String | Yes | Billing month in format "YYYY-MM" (e.g., "2024-01") |

## Excel File Format
The Excel file should have the following columns in the first row (header row will be skipped):

| Column | Field | Type | Required | Description |
|--------|-------|------|----------|-------------|
| A | tenantName | String | Yes | Name of the tenant |
| B | propertyName | String | Yes | Name of the property |
| C | waterUnits | Number | Yes | Number of water units consumed |
| D | waterRate | Number | Yes | Rate per water unit |
| E | totalAmount | Number | Yes | Total amount (units × rate) |
| F | description | String | No | Description (defaults to "Water Bill") |

### Sample Excel Data:
```
tenantName    | propertyName | waterUnits | waterRate | totalAmount | description
John Doe      | Apartment A1 | 25         | 10        | 250         | Water Bill - January
Jane Smith    | Apartment B2 | 30         | 10        | 300         | Water Bill - January
```

## Response Format
```json
{
  "message": "Successfully created 2 water bills and vouchers",
  "createdBills": 2,
  "createdVouchers": 2,
  "bills": [...],
  "vouchers": [...]
}
```

## Features
1. **Automatic Bill Creation**: Creates Bill records for each row in the Excel file
2. **UnifiedVoucher Integration**: Automatically creates corresponding accounting vouchers
3. **Duplicate Prevention**: Skips bills that already exist for the same tenant, property, and month
4. **Error Handling**: Continues processing even if individual rows fail
5. **Invoice Generation**: Automatically generates unique invoice numbers
6. **Due Date Calculation**: Sets due date to 30 days from billing date

## UnifiedVoucher Details
Each water bill creates an Accounts Receivable (AR) voucher with:
- **Voucher Type**: `AR` (Accounts Receivable)
- **Debit Account**: Customer (Tenant)
- **Credit Account**: Company (Water Revenue)
- **Payment Status**: `pending`
- **Due Date**: 30 days from billing date
- **Tags**: `['Water Bill', 'Bulk Upload']`
- **Details**: Includes water units, rate, and billing period

## Error Handling
- **File Validation**: Only Excel files (.xls, .xlsx) are accepted
- **Required Fields**: Validates that all required fields are present
- **Tenant/Property Lookup**: Skips rows where tenant or property is not found
- **Duplicate Bills**: Skips bills that already exist for the same period
- **Partial Success**: Returns results even if some rows fail to process

## Example Usage

### cURL Example:
```bash
curl -X POST \
  http://localhost:3000/api/v1/bill/bulkUploadWaterBills \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@water_bills.xlsx' \
  -F 'companyId=60f7b3b3b3b3b3b3b3b3b3b3' \
  -F 'createdBy=60f7b3b3b3b3b3b3b3b3b3b4' \
  -F 'billingMonth=2024-01'
```

### JavaScript Example:
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('companyId', '60f7b3b3b3b3b3b3b3b3b3b3');
formData.append('createdBy', '60f7b3b3b3b3b3b3b3b3b3b4');
formData.append('billingMonth', '2024-01');

fetch('/api/v1/bill/bulkUploadWaterBills', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

## Notes
- The API processes each row individually, so partial success is possible
- Failed rows are logged but don't stop the entire process
- Invoice numbers are automatically generated with format: `{PREFIX}{YEAR}{MONTH}{RANDOM}`
- All created bills start with `status: false` (unpaid)
- The system automatically calculates due dates and sets up payment tracking
