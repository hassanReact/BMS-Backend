import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "ProductRegistration",
  tableName: "product_registrations",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    productName: { name: "product_name", type: "varchar", nullable: false },
    productModel: { name: "product_model", type: "varchar", nullable: false },
    productDescription: {
      name: "product_description",
      type: "text",
      nullable: false,
    },
    companyId: { name: "company_id", type: "uuid", nullable: true },
    isDeleted: { name: "is_deleted", type: "boolean", default: false },
    createdAt: { name: "created_at", type: "timestamp", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamp", updateDate: true },
  },

  relations: {
    company: {
      type: "many-to-one",
      target: "Company",
      joinColumn: { name: "company_id", referencedColumnName: "id" },
      nullable: true,
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },
    purchaseDetails: {
      type: "one-to-many",
      target: "PurchaseDetails",
      inverseSide: "product",
    },
    usageDetails: {
      type: "one-to-many",
      target: "UsageDetails",
      inverseSide: "product",
    },
  },
});