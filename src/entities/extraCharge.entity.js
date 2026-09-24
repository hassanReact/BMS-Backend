import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "ExtraCharge",
  tableName: "extra_charges",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    serviceName: { name: "service_name", type: "varchar", nullable: true },
    details: { type: "text", nullable: true },
    price: { type: "varchar", nullable: true },
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
  },
});