import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "AccountsPayable",
  tableName: "accounts_payable",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    companyId: { name: "company_id", type: "uuid", nullable: false },
    type: {
      type: "enum",
      enum: ["PurchaseDetails", "staff", "ServiceProvider", "bill"],
      nullable: false,
    },
    referenceId: { name: "reference_id", type: "uuid", nullable: false },
    referenceModel: {
      name: "reference_model",
      type: "enum",
      enum: ["PurchaseDetails", "staff", "ServiceProvider", "bill"],
      nullable: false,
    },
    amount: { type: "numeric", nullable: false },
    purchaseDetailId: {
      name: "purchase_detail_id",
      type: "uuid",
      nullable: true,
    },
    productName: { name: "product_name", type: "varchar", nullable: true },
    vendorName: { name: "vendor_name", type: "varchar", nullable: true },
    unit: { type: "varchar", nullable: true },
    quantity: { type: "numeric", nullable: true },
    unitPerPrice: { name: "unit_per_price", type: "numeric", nullable: true },
    bill: { type: "varchar", nullable: true },
    month: { type: "varchar", nullable: false },
    status: { type: "enum", enum: ["pending", "approved"], default: "pending" },
    isDeleted: { name: "is_deleted", type: "boolean", default: false },
    createdAt: { name: "created_at", type: "timestamp", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamp", updateDate: true },
  },

  relations: {
    company: {
      type: "many-to-one",
      target: "Company",
      joinColumn: { name: "company_id", referencedColumnName: "id" },
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },
    purchaseDetail: {
      type: "many-to-one",
      target: "PurchaseDetails",
      joinColumn: { name: "purchase_detail_id", referencedColumnName: "id" },
      nullable: true,
      onDelete: "SET NULL",
      onUpdate: "NO ACTION",
    },
  },
});