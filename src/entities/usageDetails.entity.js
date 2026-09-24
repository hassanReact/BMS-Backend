import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "UsageDetails",
  tableName: "usage_details",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    productId: { name: "product_id", type: "uuid", nullable: false },
    companyId: { name: "company_id", type: "uuid", nullable: true },
    productName: { name: "product_name", type: "varchar", nullable: false },
    productQuantity: { name: "product_quantity", type: "numeric", nullable: false },
    usedFor: {
      name: "used_for",
      type: "enum",
      enum: ["general", "resident"],
      nullable: false,
    },
    generalDescription: { name: "general_description", type: "text", nullable: true },
    residentName: { name: "resident_name", type: "varchar", nullable: true },
    residentId: { name: "resident_id", type: "uuid", nullable: true },
    billingType: {
      name: "billing_type",
      type: "enum",
      enum: ["foc", "price"],
      nullable: false,
    },
    focDescription: { name: "foc_description", type: "text", nullable: true },
    productPrice: { name: "product_price", type: "numeric", nullable: true },
    priceDescription: { name: "price_description", type: "text", nullable: true },
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
    resident: {
      type: "many-to-one",
      target: "Tenant",
      joinColumn: { name: "resident_id", referencedColumnName: "id" },
      nullable: true,
      onDelete: "SET NULL",
      onUpdate: "NO ACTION",
    },
  },
});