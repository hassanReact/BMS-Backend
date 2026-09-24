import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Maintenance",
  tableName: "maintenance",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    propertyType: {
      name: "property_type",
      type: "enum",
      enum: ["Vacant", "Occupied"],
      nullable: false,
    },
    maintenanceAmount: {
      name: "maintenance_amount",
      type: "numeric",
      nullable: true,
    },
    surchargeAmount: {
      name: "surcharge_amount",
      type: "numeric",
      nullable: true,
    },
    date: { type: "varchar", nullable: false },
    dueDate: { name: "due_date", type: "varchar", nullable: false },
    maintenanceMonth: {
      name: "maintenance_month",
      type: "varchar",
      nullable: false,
    },
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