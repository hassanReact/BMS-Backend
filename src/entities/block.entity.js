import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Block",
  tableName: "blocks",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },
    projectId: {
      name: "project_id",
      type: "uuid",
      nullable: true,
    },
    blockName: {
      name: "block_name",
      type: "varchar",
      nullable: true,
    },
    description: {
      type: "text",
      nullable: true,
    },
    isDeleted: {
      name: "is_deleted",
      type: "boolean",
      default: false,
    },
    companyId: {
      name: "company_id",
      type: "uuid",
      nullable: true,
    },
    createdAt: {
      name: "created_at",
      type: "timestamp",
      createDate: true,
    },
    updatedAt: {
      name: "updated_at",
      type: "timestamp",
      updateDate: true,
    },
  },

  relations: {
    project: {
      type: "many-to-one",
      target: "project",
      joinColumn: { name: "project_id", referencedColumnName: "id" },
      nullable: true,
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
    properties: { type: "one-to-many", target: "Property", inverseSide: "block" },
    bookings: { type: "one-to-many", target: "Booking", inverseSide: "block" },
  },
});