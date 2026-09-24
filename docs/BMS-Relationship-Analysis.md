# BMS Relationship Analysis

This document records the relationship pass from the Mongoose models to the
TypeORM EntitySchemas. MongoDB ObjectId values are represented by PostgreSQL
UUID columns; the MongoDB-to-PostgreSQL ID mapping belongs to the data
migration, not the entities.

## Direct Relationships

Each owning-side field below has TypeORM `many-to-one` metadata using the
existing UUID column. Inverse collections are added only where they are useful
for navigation. Physical foreign keys are deferred until the target tables are
created and orphan data has been checked.

| Model.field | Cardinality | FK column | Target | Delete policy |
| --- | --- | --- | --- | --- |
| Company.userId | N:1 | companies.user_id | users.id | RESTRICT |
| Company.subcriptionId | N:1 | companies.subcription_id | subscriptions.id | SET NULL |
| UserRole.userId | N:1 | user_roles.user_id | users.id | RESTRICT |
| UserRole.roleId | N:1 | user_roles.role_id | roles.id | RESTRICT |
| UserRole.companyId | N:1 | user_roles.company_id | companies.id | SET NULL |
| Owner.userId, companyId | N:1 | owners.user_id, company_id | users.id, companies.id | RESTRICT |
| Tenant.userId, companyId | N:1 | tenants.user_id, company_id | users.id, companies.id | RESTRICT |
| Agent.userId, companyId | N:1 | agents.user_id, company_id | users.id, companies.id | RESTRICT |
| Staff.userId, companyId | N:1 | staff.user_id, company_id | users.id, companies.id | RESTRICT |
| Project.companyId | N:1 | projects.company_id | companies.id | RESTRICT |
| Block.projectId, companyId | N:1 | blocks.project_id, company_id | projects.id, companies.id | RESTRICT |
| Type.companyId | N:1 | types.company_id | companies.id | RESTRICT |
| Property.typeId | N:1 | properties.type_id | types.id | SET NULL |
| Property.ownerId, tenantId | N:1 | properties.owner_id, tenant_id | owners.id, tenants.id | SET NULL |
| Property.projectId, blockId, companyId | N:1 | properties.project_id, block_id, company_id | projects.id, blocks.id, companies.id | SET NULL/RESTRICT |
| Booking.propertyId, ownerId, tenantId, companyId | N:1 | bookings.property_id, owner_id, tenant_id, company_id | properties.id, owners.id, tenants.id, companies.id | RESTRICT |
| Booking.projectId, blockId | N:1 | bookings.project_id, block_id | projects.id, blocks.id | SET NULL |
| Bill.tenantId, propertyId, bookingId, companyId | N:1 | bills.tenant_id, property_id, booking_id, company_id | tenants.id, properties.id, bookings.id, companies.id | RESTRICT |
| Bill.deletedBy | N:1 | bills.deleted_by | companies.id | SET NULL |
| Complaint.propertyId, companyId, tenantId | N:1 | complaints.property_id, company_id, tenant_id | properties.id, companies.id, tenants.id | RESTRICT |
| Complaint.assignedId | N:1 | complaints.assigned_id | staff.id | SET NULL |
| Comment.complaintId, companyId | N:1 | comments.complaint_id, company_id | complaints.id, companies.id | RESTRICT/SET NULL |
| PropertyImg.propertyId | N:1 | property_images.property_id | properties.id | RESTRICT |
| TenantDocs.tenantId | N:1 | tenant_docs.tenant_id | tenants.id | RESTRICT |
| Maintenance.companyId | N:1 | maintenance.company_id | companies.id | RESTRICT |
| Announcement.companyId | N:1 | announcements.company_id | companies.id | RESTRICT |
| ExtraCharge.companyId | N:1 | extra_charges.company_id | companies.id | RESTRICT |
| ServiceProvider.companyId | N:1 | service_providers.company_id | companies.id | RESTRICT |
| Vendor.companyId | N:1 | vendors.company_id | companies.id | RESTRICT |
| Transaction.companyId, subscriptionId | N:1 | transactions.company_id, subscription_id | companies.id, subscriptions.id | RESTRICT/SET NULL |
| TransactionalAccounts.companyId | N:1 | transactional_accounts.company_id | companies.id | RESTRICT |
| ProductRegistration.companyId | N:1 | product_registrations.company_id | companies.id | RESTRICT |
| PurchaseDetails.productId, vendorId, companyId | N:1 | purchase_details.product_id, vendor_id, company_id | product_registrations.id, vendors.id, companies.id | RESTRICT |
| UsageDetails.productId, residentId, companyId | N:1 | usage_details.product_id, resident_id, company_id | product_registrations.id, tenants.id, companies.id | RESTRICT/SET NULL |
| AccountsPayable.companyId | N:1 | accounts_payable.company_id | companies.id | RESTRICT |
| AccountsReceivable.propertyId, companyId | N:1 | accounts_receivable.property_id, company_id | properties.id, companies.id | RESTRICT |
| AccountsReceivable.deletedBy | N:1 | accounts_receivable.deleted_by | companies.id | SET NULL |
| GeneralBill.propertyId, companyId | N:1 | general_bills.property_id, company_id | properties.id, companies.id | RESTRICT |
| AccountVoucher.companyId | N:1 | account_vouchers.company_id | companies.id | RESTRICT |
| AccountVoucher.deletedBy | N:1 | account_vouchers.deleted_by | companies.id | SET NULL |
| UnifiedVoucher.companyId, propertyId | N:1 | unified_vouchers.company_id, property_id | companies.id, properties.id | RESTRICT |
| UnifiedVoucher.approvedBy | N:1 | unified_vouchers.approved_by | users.id | SET NULL |

`createdBy` fields in Booking and Bill have no Mongoose `ref`, so they remain
UUID columns without TypeORM relations. `Tenant.reporterId` and Comment's
`senderId` are also untyped ObjectId fields without `ref` and therefore do not
receive relations.

## User, Role, and UserRole

The intended architecture is a join table: one User can have many UserRole
rows and one Role can have many UserRole rows. The TypeORM metadata reflects
that design. The existing Mongoose unique index on `userId` is not reproduced,
because it conflicts with the application's role assignments for owners,
tenants, staff, agents, and company admins. The intended future uniqueness is
`(user_id, role_id, company_id)`, with a separate nullable-company strategy
for the global SuperAdmin row.

## Polymorphic Relationships

### AccountsPayable.referenceId

- Type: `refPath: referenceModel`
- Models: `PurchaseDetails`, `staff`, `ServiceProvider`, `bill`
- Usage: payable records are migrated into UnifiedVoucher and queried by the
  discriminator; no single referenced table exists.
- PostgreSQL design: `reference_id UUID` plus `reference_model` enum.
- FK: deferred permanently for this column unless normalized association
  tables are introduced.

### AccountsReceivable.referenceId

- Type: `refPath: referenceModel`
- Models: `Maintenance`, `Bill`
- Usage: source record is copied into UnifiedVoucher as the debit account.
- PostgreSQL design: `reference_id UUID` plus `reference_model` enum.
- FK: no direct FK because the target varies.

### GeneralBill.referenceId

- Type: `refPath: referenceModel`
- Models: `Maintenance`, `Bill`
- PostgreSQL design: type plus UUID; no direct FK.

### AccountVoucher.referenceId

- Type: `refPath: models`
- Models: `Property`, `PurchaseDetails`, `Vendor`, `Transaction`, `Staff`,
  `Customer`, `Maintenance`, `Bill`, `Account`, `ServiceProvider`
- `credit.referenceId` and `debit.referenceId` use their own
  `referenceModel` discriminators with an overlapping model set.
- PostgreSQL design: the top-level polymorphic reference and both nested
  entries remain JSONB/type-plus-ID data; no fake FK is created.

### UnifiedVoucher.sourceDocument.referenceId

- Type: `refPath: sourceDocument.referenceModel`
- Models: `Maintenance`, `UsageDetails`, `Bill`, `PurchaseDetails`, `Vendor`,
  `ServiceProvider`, `Staff`, `Property`
- Usage: billing and accounting services write the originating document and
  later populate it by model name.
- PostgreSQL design: JSONB `{referenceId, referenceModel}`.

### UnifiedVoucher.debit.accountId and credit.accountId

- Type: nested `refPath` selected by `accountType`.
- Models: `Customer`, `Property`, `Vendor`, `UsageDetails`, `Staff`,
  `PurchaseDetails`, `ServiceProvider`, `Account`, `Company`, `Bill`.
- Usage: the accounting services populate both entries and calculate balances
  by `(accountId, accountType)`.
- PostgreSQL design: JSONB `{accountId, accountType, accountName}`.
- A normalized `voucher_entries` table with `account_type`, `account_id`,
  `account_name`, and debit/credit direction is the recommended future design.

### Embedded self-references

`UnifiedVoucher.linkedVouchers[].voucherId` and
`paymentHistory[].voucherId` reference UnifiedVoucher, but both are embedded
arrays in MongoDB. They are currently JSONB to preserve the source document.
A normalized `voucher_links` table is recommended before independent querying
or referential enforcement is required.

## Embedded Relationship Data

- `Property.maintencanceHistory[].maintenanceId`: JSONB; historical snapshots
  are embedded and the field name is preserved. Normalize only if history is
  queried independently.
- `Staff.jobCompleted[].complaintId`: JSONB; this is a status list embedded in
  Staff. A `staff_complaints` child table is recommended if completion history
  becomes independently reportable.
- `Comment.readBy[].userId`: JSONB; this is read-state metadata, not the
  comment's owning sender relationship.
- `Tenant.files`, `Bill.extraCharges`: JSONB embedded value objects.

## Deferred Foreign-Key Migrations

FK migration files were created but not run. The applied migration set does
not create the new `users`, `companies`, profile, property, billing, inventory,
and accounting tables, so `AddRelationshipForeignKeys1789058000000` fails fast
until those tables exist. This prevents a migration from being marked applied
while silently skipping constraints. After table creation and MongoDB
ID-mapping/orphan validation, run it using this document's delete policies.
It never adds FKs for polymorphic fields.

## Source Problems

- `generalLedger.model.js` is internally invalid: it defines a ledger-shaped
  schema but exports an undefined `Block`/`blockSchema`.
- `inventory.purchaseDetailId` references the literal model name
  `purchaseDetailId`, which does not correspond to a registered model.
- `UnifiedVoucher` middleware calculates `totalAmountOwed` from `this.amount`
  even though `amount` is an object; this needs application-layer correction
  during the PostgreSQL service migration.
- Several profile models retain duplicated email/password fields alongside
  centralized User records. They are preserved for data compatibility but
  should eventually be removed from authentication flows.

## Mongoose Populate Migration Map

Existing Mongoose populate calls must be replaced by TypeORM relation loading
or explicit joins. The existing services are intentionally unchanged.

| Mongoose path | TypeORM relation/property | Query equivalent |
| --- | --- | --- |
| `tenantId` | `tenant` | `leftJoinAndSelect("booking.tenant", "tenant")` |
| `propertyId` | `property` | `leftJoinAndSelect("booking.property", "property")` |
| `ownerId` | `owner` | `leftJoinAndSelect("booking.owner", "owner")` |
| `companyId` | `company` | `leftJoinAndSelect("booking.company", "company")` |
| `projectId` | `project` | `leftJoinAndSelect("booking.project", "project")` |
| `blockId` | `block` | `leftJoinAndSelect("booking.block", "block")` |
| `typeId` | `type` | `leftJoinAndSelect("property.type", "type")` |
| `assignedId` | `assignedStaff` | `leftJoinAndSelect("complaint.assignedStaff", "staff")` |
| `bookingId` | `booking` | `leftJoinAndSelect("bill.booking", "booking")` |
| `residentId` | `resident` | `leftJoinAndSelect("usage.resident", "tenant")` |
| `productId` | `product` | `leftJoinAndSelect("purchase.product", "product")` |
| `vendorId` | `vendor` | `leftJoinAndSelect("purchase.vendor", "vendor")` |
| `subscriptionId` | `subscription` | `leftJoinAndSelect("transaction.subscription", "subscription")` |

These paths are not equivalent without application logic:

- `debit.accountId`
- `credit.accountId`
- `sourceDocument.referenceId`
- `credit.referenceId`
- `debit.referenceId`

They are polymorphic JSONB/type-plus-ID values and require a discriminator-based
lookup or a future normalized association table.

## ObjectId-to-UUID Mapping Strategy

The data migration must create and retain a mapping before inserting dependent
rows:

```text
mongo_model | mongo_object_id | postgres_table | postgres_uuid
```

For each source collection, insert parent records first, generate PostgreSQL
UUIDs, and record the mapping. Resolve every child `*_id` through that mapping.
For polymorphic values, resolve using both the discriminator and ObjectId.
Reject unresolved references into a quarantine report; never cast a 24-character
MongoDB ObjectId directly to UUID. Keep the mapping table permanently or retain
an equivalent audit artifact for reconciliation.