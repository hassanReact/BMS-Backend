import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "PropertyImg",
  tableName: "property_images",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    documentName: { name: "document_name", type: "varchar", nullable: true },
    url: { type: "text", nullable: true },
    propertyId: { name: "property_id", type: "uuid", nullable: true },
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
  },
});