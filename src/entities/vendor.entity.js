import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Vendor",
  tableName: "vendors",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    vendorName: { name: "vendor_name", type: "varchar", nullable: false },
    vendorEmail: { name: "vendor_email", type: "varchar", nullable: false },
    vendorContact: { name: "vendor_contact", type: "varchar", nullable: false },
    vendorAccountNo: {
      name: "vendor_account_no",
      type: "varchar",
      nullable: false,
    },
    companyId: { name: "company_id", type: "uuid", nullable: true },
    description: { type: "text", nullable: true },
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
  },
});