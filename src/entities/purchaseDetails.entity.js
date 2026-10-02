import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "PurchaseDetails",
  tableName: "purchase_details",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    purchaseDetailId: {
      name: "purchase_detail_id",
      type: "uuid",
      nullable: true,
    },
    productId: { name: "product_id", type: "uuid", nullable: false },
    companyId: { name: "company_id", type: "uuid", nullable: true },
    productName: { name: "product_name", type: "varchar", nullable: false },
    vendorName: { name: "vendor_name", type: "varchar", nullable: false },
    vendorId: { name: "vendor_id", type: "uuid", nullable: false },
    status: {
      type: "enum",
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    unit: {
      type: "enum",
      enum: ["kg", "meter", "number", "feet"],
      nullable: false,
    },
    quantity: { type: "numeric", nullable: false },
    unitPerPrice: { name: "unit_per_price", type: "numeric", nullable: false },
    bill: { type: "varchar", nullable: false },
    billNumber: { name: "bill_number", type: "varchar", nullable: false },
    isDeleted: { name: "is_deleted", type: "boolean", default: false },
    createdAt: { name: "created_at", type: "timestamp", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamp", updateDate: true },
  },

  relations: {
    product: {
      type: "many-to-one",
      target: "ProductRegistration",
      joinColumn: { name: "product_id", referencedColumnName: "id" },
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },
    company: {
      type: "many-to-one",
      target: "Company",
      joinColumn: { name: "company_id", referencedColumnName: "id" },
      nullable: true,
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },
    vendor: {
      type: "many-to-one",
      target: "Vendor",
      joinColumn: { name: "vendor_id", referencedColumnName: "id" },
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },
  },
});