import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Tenant",
  tableName: "tenants",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    userId: { name: "user_id", type: "uuid", nullable: false },
    tenantName: { name: "tenant_name", type: "varchar", nullable: true },
    email: { type: "varchar", nullable: true },
    password: { type: "varchar", nullable: true },
    phoneno: { name: "phoneno", type: "varchar", nullable: true },
    identityCardType: {
      name: "identity_card_type",
      type: "varchar",
      nullable: true,
    },
    identityNo: { name: "identity_no", type: "varchar", nullable: true },
    files: { type: "jsonb", nullable: true },
    address: { type: "text", nullable: true },
    role: { type: "varchar", default: "tenant" },
    status: { type: "boolean", default: true },
    isDeleted: { name: "is_deleted", type: "boolean", default: false },
    isOccupied: { name: "is_occupied", type: "boolean", default: false },
    companyId: { name: "company_id", type: "uuid", nullable: true },
    reporterId: { name: "reporter_id", type: "uuid", nullable: true },
    createdAt: { name: "created_at", type: "timestamp", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamp", updateDate: true },
  },

  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "user_id", referencedColumnName: "id" },
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
  },
});