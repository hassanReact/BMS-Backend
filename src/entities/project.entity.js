import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "project",
  tableName: "projects",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },
    projectName: {
      name: "project_name",
      type: "varchar",
      nullable: true,
    },
    projectDetails: {
      name: "project_details",
      type: "text",
      nullable: true,
    },
    companyId: {
      name: "company_id",
      type: "uuid",
      nullable: true,
    },
    isDeleted: {
      name: "is_deleted",
      type: "boolean",
      default: false,
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
    company: {
      type: "many-to-one",
      target: "Company",
      joinColumn: { name: "company_id", referencedColumnName: "id" },
      nullable: true,
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },
    blocks: { type: "one-to-many", target: "Block", inverseSide: "project" },
    properties: { type: "one-to-many", target: "Property", inverseSide: "project" },
    bookings: { type: "one-to-many", target: "Booking", inverseSide: "project" },
  },
});