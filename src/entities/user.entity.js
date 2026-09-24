import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "User",
  tableName: "users",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    fullname: {
      type: "varchar",
      nullable: true,
    },

    email: {
      type: "varchar",
      nullable: false,
      unique: true,
    },

    password: {
      type: "varchar",
      nullable: true,
    },

    phoneNo: {
      name: "phone_no",
      type: "varchar",
      nullable: true,
    },

    address: {
      type: "text",
      nullable: true,
    },

    isDeleted: {
      name: "is_deleted",
      type: "boolean",
      default: false,
    },

    refreshToken: {
      name: "refresh_token",
      type: "text",
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

  indices: [
    {
      name: "IDX_users_is_deleted",
      columns: ["isDeleted"],
    },
    {
      name: "IDX_users_created_at",
      columns: ["createdAt"],
    },
  ],

  relations: {
    companies: {
      type: "one-to-many",
      target: "Company",
      inverseSide: "user",
    },

    userRoles: {
      type: "one-to-many",
      target: "UserRole",
      inverseSide: "user",
    },

    approvedVouchers: {
      type: "one-to-many",
      target: "UnifiedVoucher",
      inverseSide: "approvedBy",
    },
  },
});