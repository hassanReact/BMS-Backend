import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "TranstionalAccounts",
  tableName: "transactional_accounts",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    accountName: { name: "account_name", type: "varchar", nullable: true },
    accountNumber: { name: "account_number", type: "varchar", nullable: true },
    details: { type: "text", nullable: true },
    isDeleted: { name: "is_deleted", type: "boolean", default: false },
    companyId: { name: "company_id", type: "uuid", nullable: true },
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