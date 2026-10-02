import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "GeneralBill",
  tableName: "general_bills",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    type: { type: "enum", enum: ["Maintenance", "Bill"], nullable: false },
    referenceId: { name: "reference_id", type: "uuid", nullable: false },
    referenceModel: {
      name: "reference_model",
      type: "enum",
      enum: ["Maintenance", "Bill"],
      nullable: false,
    },
    propertyId: { name: "property_id", type: "uuid", nullable: true },
    companyId: { name: "company_id", type: "uuid", nullable: false },
    amount: { type: "numeric", nullable: false },
    name: { type: "varchar", nullable: true },
    month: { type: "varchar", nullable: false },
    status: { type: "enum", enum: ["Pending", "Paid"], default: "Pending" },
    isDeleted: { name: "is_deleted", type: "boolean", default: false },
    createdAt: { name: "created_at", type: "timestamp", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamp", updateDate: true },
  },

  relations: {
    property: {
      type: "many-to-one",
      target: "Property",
      joinColumn: { name: "property_id", referencedColumnName: "id" },
      nullable: true,
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },
    company: {
      type: "many-to-one",
      target: "Company",
      joinColumn: { name: "company_id", referencedColumnName: "id" },
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },
  },
});