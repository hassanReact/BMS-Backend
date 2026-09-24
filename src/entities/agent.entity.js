import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Agent",

  tableName: "agents",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    userId: {
      name: "user_id",
      type: "uuid",
      nullable: false,
    },

    agentName: {
      name: "agent_name",
      type: "varchar",
      nullable: true,
    },

    email: {
      type: "varchar",
      nullable: true,
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

    role: {
      type: "varchar",
      default: "Agent",
    },

    status: {
      type: "boolean",
      default: true,
    },

    address: {
      type: "text",
      nullable: true,
    },

    isDeleted: {
      name: "is_deleted",
      type: "varchar",
      default: "false",
    },

    companyId: {
      name: "company_id",
      type: "uuid",
      nullable: true,
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

  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "user_id",
        referencedColumnName: "id",
      },
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },

    company: {
      type: "many-to-one",
      target: "Company",
      joinColumn: {
        name: "company_id",
        referencedColumnName: "id",
      },
      nullable: true,
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },

    complaints: {
      type: "one-to-many",
      target: "Complaint",
      inverseSide: "agent",
    },
  },
});