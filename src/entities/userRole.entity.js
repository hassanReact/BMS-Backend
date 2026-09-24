import { EntitySchema } from 'typeorm';

export default new EntitySchema({
    name: "UserRole",
    tableName: "user_roles",
    columns: {
        id: {
            type: "uuid",
            primary: true,
            generated: "uuid",
        },
        roleId: {
            name: "role_id",
            type: "uuid",
            nullable: false,
        },
        userId: {
            name: "user_id",
            type: "uuid",
            nullable: false,
        },
        companyId: {
            name: "company_id",
            type: "uuid",
            nullable: true,
        },
        status: {
            name:"status",
            type: "enum",
            enum: ["active", "inactive"],
            default: "active",
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
            joinColumn: { name: "user_id", referencedColumnName: "id" },
            onDelete: "RESTRICT",
            onUpdate: "NO ACTION",
        },
        role: {
            type: "many-to-one",
            target: "Role",
            joinColumn: { name: "role_id", referencedColumnName: "id" },
            onDelete: "RESTRICT",
            onUpdate: "NO ACTION",
        },
        company: {
            type: "many-to-one",
            target: "Company",
            joinColumn: { name: "company_id", referencedColumnName: "id" },
            nullable: true,
            onDelete: "SET NULL",
            onUpdate: "NO ACTION",
        },
    },
    indices: [
         {
      name: "UQ_user_roles_user",
      columns: ["userId"],
      unique: true,
    }
    ],
})