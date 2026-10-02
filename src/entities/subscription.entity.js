import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Subscription",
  tableName: "subscriptions",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    title: {
      type: "varchar",
      length: 255,
      nullable: true,
    },

    noOfDays: {
      name: "no_of_days",
      type: "integer",
      nullable: true,
    },

    amount: {
      type: "numeric",
      precision: 12,
      scale: 2,
      nullable: true,
    },

    discount: {
      type: "numeric",
      precision: 12,
      scale: 2,
      nullable: true,
    },

    discription: {
      name: "discription",
      type: "text",
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
    companies: {
      type: "one-to-many",
      target: "Company",
      inverseSide: "subscription",
    },
  },
});