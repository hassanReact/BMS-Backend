import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Type",
  tableName: "types",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    name: { type: "varchar", nullable: true },
    description: { type: "text", nullable: true },
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
    properties: { type: "one-to-many", target: "Property", inverseSide: "type" },
  },
});