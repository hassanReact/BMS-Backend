# BMS Backend Setup and API Guide

This document describes the currently implemented BMS Backend system. It is based on the Express route registrations, controllers, services, models, validators, Docker files, and setup scripts in this repository.

## 1. System Overview

BMS Backend is a Node.js 20, Express 4, MongoDB 6 application for building/property management. Its main business areas are:

- Companies, users, roles, and super-admin initialization.
- Properties, blocks, projects, owners, tenants, bookings, and maintenance.
- Complaints, comments, announcements, staff, agents, and service providers.
- Bills, water-bill bulk import, extra charges, and subscriptions.
- Inventory products, purchases, product usage, and stock reports.
- Transactional accounts and legacy accounts payable/receivable.
- General vouchers, legacy vouchers, voucher numbering, and unified double-entry vouchers.
- File uploads for property images, tenant documents, agreements, logos, and purchase/water bills.

The API prefix is `/api/v1`. Uploaded files are served from `/uploads/...`.

## 2. Prerequisites

- Node.js 20 or a compatible modern Node.js release.
- npm.
- MongoDB 6 or a MongoDB-compatible server.
- A writable repository directory for `uploads/` and `logs/`.

## 3. Configuration

Create `.env` in the repository root. `.env.example` is the template. The application reads the following values:

| Variable | Purpose | Example |
|---|---|---|
| `DB_URI` | MongoDB connection URI used by the application | `mongodb://localhost:27017/makbmsmongodb` |
| `DB_NAME` | Database name used by setup/Docker defaults | `makbmsmongodb` |
| `PORT` | HTTP port | `7200` |
| `ENV` | Runtime environment label | `development` |
| `ACCESS_TOKEN_SECRET` | Access-token signing secret | use a long random secret |
| `ACCESS_TOKEN_EXPIRY` | Access-token lifetime | `1d` |
| `REFRESH_TOKEN_SECRET` | Refresh-token signing secret | use a different long random secret |
| `REFRESH_TOKEN_EXPIRY` | Refresh-token lifetime | `10d` |
| `PREFIX` | Inventory voucher prefix | `INV` |
| `BOOKINGPREFIX` | Booking prefix | `BOK` |
| `FEATURE_EMAIL` | Email feature switch (`on`/`off`) | `on` |
| `FEATURE_WHATSAAP` | WhatsApp feature switch (`on`/`off`) | `off` |
| `TWILIO_ACCOUNT_SID` | Twilio account, when WhatsApp is enabled | secret/configured value |
| `TWILIO_AUTH_TOKEN` | Twilio authentication token | secret/configured value |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender | `whatsapp:+...` |
| `TWILIO_WHATSAPP_TO` | Default WhatsApp recipient, if used | `whatsapp:+...` |
| `SUPER_ADMIN_NAME` | Initial super-admin name | `System Administrator` |
| `SUPER_ADMIN_EMAIL` | Initial super-admin email | `admin@example.com` |
| `SUPER_ADMIN_PASSWORD` | Initial super-admin password | use a temporary strong password |
| `SUPER_ADMIN_PHONE` | Initial super-admin phone | `+...` |
| `SUPER_ADMIN_ADDRESS` | Initial super-admin address | `Company Headquarters` |
| `FORCE_UPDATE_SUPER_ADMIN` | Whether bootstrap may update the existing admin | `false` |

Never commit real secrets. The checked-in example contains development-style credentials and must be replaced for any shared or production environment.

## 4. Local Setup

```bash
git clone <repository-url>
cd BMS-Backend
copy .env.example .env
# Edit .env and set DB_URI, PORT, secrets, and super-admin values
npm install
npm run setup
npm run create-admin:env
npm run dev
```

Useful commands:

| Command | Use |
|---|---|
| `npm start` | Start the server with Node |
| `npm run dev` | Start with nodemon |
| `npm run setup` or `npm run db:setup` | Run database setup/migration initialization |
| `npm run setup:interactive` | Interactive database setup |
| `npm run create-admin:env` | Create the super admin from environment values |
| `npm run create-admin` | Create an admin using the non-interactive script |
| `npm run setup:admin` or `npm run create-admin:interactive` | Interactive admin creation |
| `npm run Default-Roles` | Seed default roles |
| `npm run migrate:preview` | Preview unified-voucher migration |
| `npm run migrate` | Run the unified-voucher migration flow |
| `npm run prettier` | Format `src` |

`npm install` invokes the `postinstall` script, which runs `npm run setup`. Ensure MongoDB and `.env` are available before installing in a fresh environment.

## 5. Docker Setup

The default compose file starts the Node application and MongoDB 6 with a persistent `mongo_data` volume:

```bash
copy .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

The development compose file runs nodemon and publishes MongoDB on `27017` and the API on the configured host port, defaulting to `7200`.

For the production overlay:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

The production overlay expects an existing external Docker network named `proxy-net` and configures the virtual host `bmsapi.maktg.com`. Review those values before deployment.

The container entry point is `npm start`; the image exposes port `7200`. `init-mongo.js` creates the `users` and `properties` collections in `makbmsmongodb`.

## 6. First Run and Health Checks

```http
GET /api/v1/system/health
GET /api/v1/system/init-status
```

The system routes are mounted before the super-admin bootstrap middleware. Other API routes run through the global `ensureSuperAdminExists` middleware. The bootstrap scripts are the reliable way to create the initial administrator.

### Authentication note

Several route files import `authMiddleware`, but the current route registrations do not attach it with `router.use` or per-route middleware. Do not assume the API is protected by JWT based on the imports alone. Verify and enforce authentication/authorization before exposing this service outside a trusted network.

## 7. Common Request and Response Rules

- Send JSON with `Content-Type: application/json` unless an upload route says `multipart/form-data`.
- Company-scoped endpoints commonly expect `companyId` as a query parameter; some write endpoints expect it in the body.
- MongoDB identifiers are 24-character hexadecimal ObjectId strings.
- Responses are passed through the response interceptor and errors through the global exception handler. Exact response shapes vary by legacy module; callers should inspect `success`, `message`, `data`, and `error` where present.
- Most delete operations are soft deletes using `isDeleted: true`.
- Dates are accepted as values understood by JavaScript/Mongoose, for example `2026-08-28T00:00:00.000Z`.

## 8. Feature Guide and Use Cases

### Company and identity management

Use companies as the tenant boundary for all property-management data. Register a company, authenticate users/owners/tenants/staff/agents, select a role where applicable, change passwords, and configure email or WhatsApp status.

Typical sequence: create company -> create/seed roles -> create admin -> create staff/agents/owners/tenants -> create properties and blocks -> manage bookings, bills, maintenance, and accounting.

### Property operations

Projects contain blocks; properties represent units/assets; owners and tenants connect people to properties. Property registration and tenant/property registration support image/document uploads. Vacant-property queries support leasing workflows, while bookings track reservations and can be broken or billed.

### Billing and collections

Create bills for services or water usage, report meter/bill details, update status, retrieve paid/unpaid/monthly/yearly summaries, and bulk-upload water bills from a file. Bills can be linked to bookings and vouchers.

### Maintenance and complaints

Maintenance requests can be registered, edited, deleted, listed, and applied. Complaints can be assigned to staff, commented on, resolved, listed by company/agent, and soft-deleted. Comments also expose unread-message queries.

### Inventory

Register products, record purchases with a required bill upload, record product usage for general work or a resident, and retrieve stock reports and activity history. A purchase automatically creates a `PUR` unified voucher for `quantity * price`.

### Accounting

The repository contains both legacy accounts payable/receivable and the newer `UnifiedVoucher` module. Unified vouchers model AR, AP, receipts/payments, purchases, sales, journal entries, credit/debit notes, maintenance, and general-bill categories. AR/AP entries track due dates, outstanding amounts, payment status, linked payments, and accounting reports.

## 9. Unified Voucher Example

### Create a balanced voucher

```http
POST /api/v1/unified-vouchers
Content-Type: application/json
```

```json
{
  "voucherType": "AR",
  "companyId": "507f1f77bcf86cd799439011",
  "date": "2026-08-28T00:00:00.000Z",
  "month": "2026-08",
  "particulars": "August maintenance charge",
  "amount": 1500.00,
  "dueDate": "2026-09-15T00:00:00.000Z",
  "debit": {
    "accountId": "507f1f77bcf86cd799439012",
    "accountType": "Customer",
    "accountName": "Resident account"
  },
  "credit": {
    "accountId": "507f1f77bcf86cd799439011",
    "accountType": "Company",
    "accountName": "Management company"
  },
  "propertyId": "507f1f77bcf86cd799439013",
  "tags": ["Maintenance", "AR"]
}
```

### Business shortcuts

`POST /api/v1/unified-vouchers/maintenance-receivable` expects `companyId`, `customerId`, `customerName`, `amount`, and normally `propertyId`, `propertyName`, `maintenanceId`, `month`, and `dueDate`. It builds an AR entry automatically.

`POST /api/v1/unified-vouchers/vendor-payable` expects `companyId`, `vendorId`, `vendorName`, and `amount`, with optional `purchaseId`, `date`, `month`, and `dueDate`. It builds an AP entry.

`POST /api/v1/unified-vouchers/record-payment` expects `companyId`, `voucherId`, `paymentAmount`, and optional `paymentDate` and `paymentMethod`. It creates `REC` for AR or `PAY` for AP and updates the source voucher.

## 10. Unified Voucher Validation

The Joi validator requires:

- `voucherType`: `AR`, `AP`, `VCH`, `PAY`, `PUR`, `SAL`, `JV`, `CN`, `SP`, `MDN`, or `GB` in the validator. The model additionally contains `REC`, `PU`, and other values, so callers should follow the model and the specific service path being used.
- `companyId`, `debit.accountId`, and `credit.accountId`: valid ObjectIds.
- `particulars`: 3 to 500 characters.
- `amount`: positive, maximum two decimal places.
- `month`: `YYYY-MM`.
- `dueDate`: required for `AR` and `AP`.
- Debit and credit `accountType`: validator values are `Customer`, `Property`, `Vendor`, `Staff`, `ServiceProvider`, `Account`, or `Company`; the model also permits `PurchaseDetails`, `UsageDetails`, and `Bill`.
- `status`: `draft`, `pending`, `approved`, `rejected`, or `cancelled`.
- `tags`: at most 10 strings, each at most 50 characters.
- `details`: at most 1,000 characters.
- `sourceDocument.referenceModel`: one of the models accepted by the validator; model/service paths may accept additional values.

The service also checks double-entry account identity. The model requires due dates for AR/AP and calculates outstanding/total values. Because older services use nested `amount.total`, `amount.balance`, and `amount.paid` while the Joi schema describes `amount` as a number, test the chosen endpoint with the deployed model before integrating.

## 11. API Endpoint Catalog

All paths below are prefixed with `/api/v1`.

### System, users, companies, and roles

| Method | Path | Use case |
|---|---|---|
| GET | `/system/health` | Health check |
| GET | `/system/init-status` | Check initialization state |
| POST | `/user/register` | Register user |
| POST | `/user/login` | User login |
| POST | `/user/user-registeration` | Registration route declared without a visible handler |
| POST | `/company/register` | Register company |
| GET | `/company/getAllCompanies` | List companies |
| POST | `/company/login` | Company login |
| POST | `/company/select-role` | Select login role |
| PUT | `/company/edit` | Edit company |
| PATCH | `/company/delete` | Soft-delete company |
| PATCH | `/company/addMailPassword` | Configure mail password |
| GET | `/company/getComplaints` | Company complaint/comment summary |
| GET | `/company/getCompanyById` | Get company |
| PATCH | `/company/changestatus` | Change company status |
| PATCH | `/company/updateMailStatus` | Toggle email status |
| PATCH | `/company/updateWhataapStatus` | Toggle WhatsApp status |
| PATCH | `/company/addSubcriptionPlan` | Add subscription plan |
| GET | `/company/getCompananySubcription` | Get company subscription |
| GET | `/company/totalActiveCompany` | Count active companies |
| GET | `/company/totalData` | Company data totals |
| PATCH | `/company/changePassword` | Change company password |
| POST | `/types/createType` | Create a type |
| GET | `/types/getAllTypes` | List types |
| PUT | `/types/editType` | Edit type |
| DELETE | `/types/delete` | Delete type |

### People and partners

| Method | Path | Use case |
|---|---|---|
| POST | `/vendor/register` | Register vendor; requires vendor name/contact/email/account number |
| GET | `/vendor/getAllVendors` | List vendors by company |
| PUT | `/vendor/updateVendor/:id` | Update vendor |
| DELETE | `/vendor/deleteVendor/:id` | Soft-delete vendor |
| POST | `/owner/register` | Register owner |
| GET | `/owner/getAllOwner` | List owners |
| GET | `/owner/getAllOwnerProperties` | List owner properties |
| GET | `/owner/getOwnerPropertiesById` | Get properties for owner |
| POST | `/owner/login` | Owner login |
| PUT | `/owner/edit` | Edit owner |
| PATCH | `/owner/delete` | Soft-delete owner |
| GET | `/owner/getOwnerById` | Get owner |
| GET | `/owner/getPropertyByOwnerId` | Get properties by owner |
| POST | `/owner/bulkUploadOwner` | Bulk-upload owners; multipart field `files` |
| POST | `/tenant/register` | Register tenant; multipart files, up to 10 |
| GET | `/tenant/getTenants` | List tenants |
| GET | `/tenant/getTenantById` | Get tenant |
| PUT | `/tenant/editTenant` | Edit tenant |
| POST | `/tenant/login` | Tenant login |
| PATCH | `/tenant/delete` | Soft-delete tenant |
| GET | `/tenant/getMyTenants` | Get tenant associations |
| GET | `/tenant/mybooking` | Tenant bookings |
| GET | `/tenant/myproperties` | Tenant properties |
| GET | `/tenant/getAllTenants` | List all tenants |
| POST | `/tenant/tenantDoc` | Upload tenant document; multipart field `files` |
| GET | `/tenant/getAllDocs` | List tenant documents |
| DELETE | `/tenant/deleteDoc` | Delete tenant document |
| POST | `/tenant/bulkUploadTenants` | Bulk-upload tenants; multipart field `files` |
| PATCH | `/tenant/changePassword` | Change tenant password |
| POST | `/staff/register` | Register staff |
| POST | `/staff/login` | Staff login |
| PUT | `/staff/edit` | Edit staff |
| GET | `/staff/getAllStaff` | List staff |
| DELETE | `/staff/delete/:id` | Delete staff |
| GET | `/staff/getStaffById` | Get staff |
| PATCH | `/staff/changePassword` | Change staff password |
| GET | `/staff/getAllJobs` | List staff jobs |
| PUT | `/staff/update-job` | Update job status |
| POST | `/agents/register` | Register agent |
| POST | `/agents/login` | Agent login |
| PUT | `/agents/edit` | Edit agent |
| GET | `/agents/getAllAgent` | List agents |
| PATCH | `/agents/delete` | Delete agent |
| GET | `/agents/getAgentById` | Get agent |
| PATCH | `/agents/changePassword` | Change agent password |
| POST | `/serviceProvider/register` | Register provider; multipart field `agreement` |
| PUT | `/serviceProvider/edit` | Edit provider |
| PATCH | `/serviceProvider/delete` | Delete provider |
| GET | `/serviceProvider/getServiceProviders` | List providers |
| POST | `/serviceProvider/invoice` | Create provider invoice |

### Property, project, block, booking, and maintenance

| Method | Path | Use case |
|---|---|---|
| POST | `/project/register` | Register project |
| PUT | `/project/edit` | Edit project |
| PATCH | `/project/delete` | Delete project |
| GET | `/project/getProject` | List projects |
| POST | `/block/register` | Register block |
| PUT | `/block/edit` | Edit block |
| PATCH | `/block/delete` | Delete block |
| GET | `/block/getBlock` | List blocks |
| POST | `/property/register` | Register property; multipart `files`, up to 10 |
| PUT | `/property/editproperty` | Edit property; multipart `files`, up to 10 |
| PATCH | `/property/delete` | Delete property |
| GET | `/property/getproperty` | List properties |
| GET | `/property/vacantproperty` | List vacant properties |
| GET | `/property/getPropertyById` | Get property |
| GET | `/property/getAllProperties` | List all properties |
| POST | `/property/uploadImages` | Upload one property image, field `files` |
| GET | `/property/getAllImages` | List property images |
| DELETE | `/property/deleteImg` | Delete property image |
| POST | `/booking/create` | Create booking |
| POST | `/booking/createBill` | Create booking bill |
| PUT | `/booking/editBooking` | Edit booking |
| GET | `/booking/getBooking` | Query bookings |
| GET | `/booking/allBooking` | List bookings |
| GET | `/booking/getBookingById` | Get booking |
| PATCH | `/booking/breakTheBooking` | Break/cancel booking |
| GET | `/booking/propertyOnNotice` | List properties on notice |
| POST | `/maintenance/register` | Register maintenance |
| PUT | `/maintenance/edit` | Edit maintenance |
| PATCH | `/maintenance/delete` | Delete maintenance |
| GET | `/maintenance/getMaintenance` | List maintenance |
| POST | `/maintenance/apply` | Apply maintenance charge/workflow |

### Complaints, comments, announcements, and branding

| Method | Path | Use case |
|---|---|---|
| POST | `/complain/register` | Register complaint |
| GET | `/complain/allComplain` | List complaints |
| PUT | `/complain/editComplain` | Edit complaint |
| PATCH | `/complain/delete` | Delete complaint |
| GET | `/complain/allComplainForCompany` | Company complaint list |
| GET | `/complain/getComplainById` | Get complaint |
| PATCH | `/complain/resolveComplain` | Resolve complaint |
| PATCH | `/complain/addCommentToComplain` | Add complaint comment |
| GET | `/complain/getAllComplainCompanyAgent` | Agent/company complaint list |
| PUT | `/complain/assignedStaff` | Assign staff |
| POST | `/comments/addComment` | Add comment |
| GET | `/comments/:complaintId` | Get complaint comments |
| PUT | `/comments/markAsRead` | Mark comments read |
| GET | `/comments/new-messages/:complaintId/:userId` | Get unread messages |
| POST | `/announcement/create` | Create announcement |
| GET | `/announcement/getAllAnnouncement` | List announcements |
| GET | `/announcement/getAnnouncementById` | Get announcement |
| PUT | `/announcement/editAnnouncement` | Edit announcement |
| PATCH | `/announcement/delete` | Delete announcement |
| PATCH | `/logo/uploadLogo` | Upload logo, multipart field `file` |
| GET | `/logo/getUplaod` | Get uploaded logo |

### Bills and charges

| Method | Path | Use case |
|---|---|---|
| POST | `/bill/createBill` | Create bill |
| POST | `/bill/reporterDetails` | Store bill reporter/meter details |
| GET | `/bill/getAllBill` | List bills |
| GET | `/bill/getBillForT` | Tenant bill query |
| GET | `/bill/getBillForTPending` | Pending tenant bills |
| PATCH | `/bill/changeBillStatus` | Change bill status |
| GET | `/bill/getBillById` | Get bill |
| PATCH | `/bill/DeleteBill` | Delete bill |
| PATCH | `/bill/updateBill/:id` | Update bill |
| GET | `/bill/getBillByAgentId` | Bills created by agent |
| GET | `/bill/getBillByBookingId` | Bills for booking |
| GET | `/bill/getMonthlyBillData` | Monthly bill data |
| GET | `/bill/getTotalSales` | Sales total |
| GET | `/bill/totalYearlySales` | Yearly sales total |
| GET | `/bill/totalPendingBills` | Pending total |
| GET | `/bill/totalPaidBills` | Paid total |
| GET | `/bill/getAllUnpaidBillForAgent` | Agent unpaid bills |
| GET | `/bill/getMonthlyBillOfTenants` | Tenant monthly paid bills |
| GET | `/bill/getMonthlyPaidBillsForAgent` | Agent monthly paid bills |
| GET | `/bill/getBillSummaryBetweenDates` | Date-range summary |
| POST | `/bill/bulkUploadWaterBills` | Bulk water-bill import; multipart field `file` |
| POST | `/bill/billVoucher` | Create bill voucher |
| POST | `/extraCharge/create` | Create extra charge |
| GET | `/extraCharge/getAll` | List extra charges |
| GET | `/extraCharge/extraChargeById` | Get extra charge |
| PUT | `/extraCharge/edit` | Edit extra charge |
| PATCH | `/extraCharge/delete` | Delete extra charge |

### Inventory

| Method | Path | Use case |
|---|---|---|
| GET | `/inventory/dropdowns` | Product/vendor/property selections |
| GET | `/inventory/all-product` | List products |
| POST | `/inventory/product-registration` | Register product; product name/model/description required |
| PUT | `/inventory/editProduct/:id` | Edit product |
| DELETE | `/inventory/deleteProduct/:id` | Soft-delete product |
| POST | `/inventory/purchaseDetails` | Register purchase; multipart `bill` required |
| GET | `/inventory/getAllPurchaseDetails` | List purchases |
| GET | `/inventory/getPurchaseDetails` | Get purchase by query `id` |
| PUT | `/inventory/editPurchaseDetails/:id` | Edit purchase; optional replacement `bill` |
| DELETE | `/inventory/deletePurchaseDetails/:id` | Delete purchase |
| GET | `/inventory/product-usage` | List product usage |
| POST | `/inventory/postProductUsage` | Record product usage |
| PUT | `/inventory/editProductUsage/:id` | Edit usage |
| DELETE | `/inventory/deleteProductUsage/:id` | Delete usage |
| GET | `/inventory/allReports` | Stock reports |
| GET | `/inventory/allActivties` | Product activity history |

Purchase validation requires product/vendor IDs and names, `unit`, `quantity`, `price`, `billNumber`, and the uploaded `bill`. Allowed units are `kg`, `meter`, `number`, and `feet`. Usage allows `general` or `resident`, and billing type `foc` or `price`; conditional descriptions/IDs/prices are required for the selected mode.

### Accounting and vouchers

| Method | Path | Use case |
|---|---|---|
| POST | `/transactionalAccounts/register` | Create transactional account |
| GET | `/transactionalAccounts/getById/:id` | Get account |
| PUT | `/transactionalAccounts/edit` | Edit account |
| PATCH | `/transactionalAccounts/delete` | Delete account |
| GET | `/transactionalAccounts/getTransactionalAccounts` | List accounts |
| GET | `/accountsPayable/getAccountsPayable` | List pending payables; query `id` is company ID |
| GET | `/accountsPayable/getById` | Get payable by query `id` |
| POST | `/accountsPayable/register` | Register payable |
| PUT | `/accountsPayable/edit` | Edit payable |
| PATCH | `/accountsPayable/delete` | Delete payable |
| POST | `/accountsPayable/postVendorVoucher` | Post vendor voucher/payment |
| POST | `/accountsPayable/postPurchaseVoucher` | Post purchase voucher/payment |
| POST | `/accountsPayable/postServiceProviderVoucher` | Post provider voucher/payment |
| GET | `/accountsReceiveable/allReceives` | List outstanding receipts |
| POST | `/accountsReceiveable/postReceviablesVoucher` | Post receivable/payment voucher |
| POST | `/accountsReceiveable/postBillVoucher` | Post bill payment voucher |
| GET | `/accountsReceiveable/ledger` | Legacy ledger report |
| GET | `/accountsReceiveable/balance` | Account balance |
| GET | `/accountsReceiveable/summary` | Account summary |
| GET | `/accountsReceiveable/transaction/:voucherId` | Voucher transaction detail |
| GET | `/accountsReceiveable/vendors` | Vendor account choices |
| GET | `/accountsReceiveable/staff` | Staff account choices |
| GET | `/accountsReceiveable/accounts` | Transactional account choices |
| GET | `/accountsReceiveable/property` | Property account choices |
| GET | `/accountsReceiveable/serviceProvider` | Provider account choices |
| GET | `/voucherCounter/generate-voucher` | Generate unique voucher number |
| GET | `/voucher/getAllVoucher` | List legacy vouchers |
| GET | `/voucher/stats` | Voucher statistics |
| GET | `/voucher/getVoucher/:id` | Get legacy voucher |
| PUT | `/voucher/update/:id` | Update legacy voucher |
| DELETE | `/voucher/delete/:id` | Soft-delete legacy voucher |
| POST | `/voucher/bulk-delete` | Bulk-delete legacy vouchers |

### Unified vouchers

| Method | Path | Use case |
|---|---|---|
| POST | `/unified-vouchers` | Create double-entry voucher |
| GET | `/unified-vouchers` | List with `companyId`, pagination, type/status/month/property filters |
| GET | `/unified-vouchers/:id` | Get voucher by ID and company |
| PUT | `/unified-vouchers/:id` | Update editable voucher fields |
| DELETE | `/unified-vouchers/:id` | Soft-delete voucher |
| POST | `/unified-vouchers/maintenance-receivable` | Create maintenance AR |
| POST | `/unified-vouchers/vendor-payable` | Create vendor AP |
| POST | `/unified-vouchers/record-payment` | Record AR/AP payment |
| GET | `/unified-vouchers/accounts-receivable` | Outstanding AR, filter by property/month/status |
| GET | `/unified-vouchers/accounts-payable` | Outstanding AP, filter by property/month/status |
| GET | `/unified-vouchers/maintenance-services` | Maintenance voucher query |
| GET | `/unified-vouchers/outstanding-balance/:accountId/:accountType` | Account balance |
| PATCH | `/unified-vouchers/:id/approve` | Approve voucher |
| PATCH | `/unified-vouchers/:id/reject` | Reject voucher |
| GET | `/unified-vouchers/aging-report/:voucherType` | AR/AP aging report |
| GET | `/unified-vouchers/monthly-summary/:month` | Monthly accounting summary |
| GET | `/unified-vouchers/trial-balance/:month` | Trial balance |
| GET | `/unified-vouchers/ledger/:accountId/:accountType` | Account ledger |

## 12. Migration

The migration consolidates legacy `AccountsPayable`, `AccountsReceivable`, and `AccountsVoucher` records into the unified voucher system for one company at a time.

```bash
node src/scripts/runMigration.js 507f1f77bcf86cd799439011
```

The script validates the company ObjectId, connects using `MONGODB_URI` or its fallback URI, previews record counts, asks for confirmation, and reports migrated records/errors. Back up MongoDB and test in staging first. Note that the migration script uses `MONGODB_URI`, while the application connection uses `DB_URI`; set the variable expected by the command you are running.

## 13. Operational Caveats

- The root README contains no operational instructions; this document is the maintained setup reference.
- Endpoint naming and payload conventions are inconsistent because legacy and unified accounting modules coexist (`accountsReceiveable` spelling, `partial-paid` versus `partially_paid`, and nested versus scalar amount shapes).
- Some route declarations have typos or legacy names such as `postReceviablesVoucher`, `getUplaod`, `getAllActivties`, and `getCompananySubcription`; clients must use the implemented paths exactly.
- Several services perform only manual required-field checks, so invalid ObjectIds, numeric values, and enum values may fail at the Mongoose layer.
- Upload paths are relative to the process working directory. Preserve the `uploads/` directory and configure backups for uploaded documents and bills.
- No automated tests are defined in `package.json`; `npm test` intentionally exits with an error. Validate integrations against a disposable database before production rollout.
