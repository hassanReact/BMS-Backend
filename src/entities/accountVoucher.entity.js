import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "AccountVoucher",
  tableName: "account_vouchers",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    voucherNo: { name: "voucher_no", type: "varchar", nullable: false, unique: true },
    voucherType: {
      name: "voucher_type",
      type: "enum",
      enum: ["AP", "PUR", "VCH", "SAL", "REC", "PAY", "Bill"],
      nullable: false,
    },
    referenceId: { name: "reference_id", type: "uuid", nullable: true },
    models: {
      type: "enum",
      enum: ["Property", "PurchaseDetails", "Vendor", "Transaction", "Staff", "Customer", "Maintenance", "Bill", "Account", "ServiceProvider"],
      nullable: false,
    },
    companyId: { name: "company_id", type: "uuid", nullable: false },
    date: { type: "timestamp", default: () => "CURRENT_TIMESTAMP" },
    particulars: { type: "text", default: "" },
    credit: { type: "jsonb", nullable: false },
    debit: { type: "jsonb", nullable: false },
    amount: { type: "numeric", nullable: false },
    status: { type: "enum", enum: ["draft", "pending", "approved", "rejected"], default: "draft" },
    isDeleted: { name: "is_deleted", type: "boolean", default: false },
    details: { type: "text", default: "" },
    approvedAt: { name: "approved_at", type: "timestamp", nullable: true },
    deletedAt: { name: "deleted_at", type: "timestamp", nullable: true },
    deletedBy: { name: "deleted_by", type: "uuid", nullable: true },
    createdAt: { name: "created_at", type: "timestamp", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamp", updateDate: true },
  },
  indices: [
    { name: "IDX_account_vouchers_company_type", columns: ["companyId", "voucherType"] },
    { name: "IDX_account_vouchers_company_date", columns: ["companyId", "date"] },
  ],

  relations: {
    company: {
      type: "many-to-one",
      target: "Company",
      joinColumn: { name: "company_id", referencedColumnName: "id" },
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },
    deletedByCompany: {
      type: "many-to-one",
      target: "Company",
      joinColumn: { name: "deleted_by", referencedColumnName: "id" },
      nullable: true,
      onDelete: "SET NULL",
      onUpdate: "NO ACTION",
    },
  },
});