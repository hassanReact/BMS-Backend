import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Role",
  tableName: "roles",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    name: {
      type: "varchar",
      length: 100,
      unique: true,
      nullable: false,
    },

    permissions: {
      type: "text",
      array: true,
      default: "{}",
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
    userRoles: {
      type: "one-to-many",
      target: "UserRole",
      inverseSide: "role",
    },
  },
});