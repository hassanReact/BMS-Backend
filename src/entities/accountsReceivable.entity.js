import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "AccountsReceivable",
  tableName: "accounts_receivable",
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
    propertyName: { name: "property_name", type: "varchar", nullable: true },
    month: { type: "varchar", nullable: false },
    status: { type: "enum", enum: ["Pending", "Paid"], default: "Pending" },
    isDeleted: { name: "is_deleted", type: "boolean", default: false },
    deletedAt: { name: "deleted_at", type: "timestamp", nullable: true },
    deletedBy: { name: "deleted_by", type: "uuid", nullable: true },
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
    deletedByCompany: {
      type: "many-to-one",
      target: "Company",
      joinColumn: { name: "deleted_by", referencedColumnName: "id" },
      nullable: true,
      onDelete: "SET NULL",
      onUpdate: "NO ACTION",
    },
  },
});