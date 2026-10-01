import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Complaint",

  tableName: "complaints",

  columns: {
    id: {
      type: "uuid",
      primary: true,
      generated: "uuid",
    },

    tenantName: {
      name: "tenant_name",
      type: "varchar",
      nullable: true,
    },

    propertyId: {
      name: "property_id",
      type: "uuid",
      nullable: true,
    },

    companyId: {
      name: "company_id",
      type: "uuid",
      nullable: true,
    },

    tenantId: {
      name: "tenant_id",
      type: "uuid",
      nullable: true,
    },

    agentId: {
      name: "agent_id",
      type: "uuid",
      nullable: true,
    },

    concernTopic: {
      name: "concern_topic",
      type: "varchar",
      nullable: true,
    },

    description: {
      type: "text",
      nullable: true,
    },

    comment: {
      type: "text",
      nullable: true,
    },

    status: {
      type: "boolean",
      default: false,
    },

    assignedName: {
      name: "assigned_name",
      type: "varchar",
      default: "",
    },

    assignedId: {
      name: "assigned_id",
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
    property: {
      type: "many-to-one",
      target: "Property",
      joinColumn: {
        name: "property_id",
        referencedColumnName: "id",
      },
      nullable: true,
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

    tenant: {
      type: "many-to-one",
      target: "Tenant",
      joinColumn: {
        name: "tenant_id",
        referencedColumnName: "id",
      },
      nullable: true,
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },

    agent: {
      type: "many-to-one",
      target: "Agent",
      joinColumn: {
        name: "agent_id",
        referencedColumnName: "id",
      },
      nullable: true,
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },

    assignedStaff: {
      type: "many-to-one",
      target: "Staff",
      joinColumn: {
        name: "assigned_id",
        referencedColumnName: "id",
      },
      nullable: true,
      onDelete: "SET NULL",
      onUpdate: "NO ACTION",
    },

    comments: {
      type: "one-to-many",
      target: "Comment",
      inverseSide: "complaint",
    },
  },
});