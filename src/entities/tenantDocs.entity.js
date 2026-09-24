import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "TenantDocs",
  tableName: "tenant_docs",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    documentName: { name: "document_name", type: "varchar", nullable: true },
    url: { type: "text", nullable: true },
    tenantId: { name: "tenant_id", type: "uuid", nullable: true },
    createdAt: { name: "created_at", type: "timestamp", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamp", updateDate: true },
  },

  relations: {
    tenant: {
      type: "many-to-one",
      target: "Tenant",
      joinColumn: { name: "tenant_id", referencedColumnName: "id" },
      nullable: true,
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },
  },
});