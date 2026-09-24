import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Staff",
  tableName: "staff",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    userId: { name: "user_id", type: "uuid", nullable: false },
    staffName: { name: "staff_name", type: "varchar", nullable: true },
    email: { type: "varchar", nullable: true },
    password: { type: "varchar", nullable: true },
    phoneNo: { name: "phone_no", type: "varchar", nullable: true },
    role: { type: "varchar", default: "staff" },
    status: { type: "boolean", default: true },
    address: { type: "text", nullable: true },
    designation: { type: "varchar", default: "" },
    Salary: { name: "Salary", type: "numeric", default: 0 },
    cnic: { type: "varchar", default: "" },
    isDeleted: { name: "is_deleted", type: "boolean", default: false },
    companyId: { name: "company_id", type: "uuid", nullable: true },
    refreshToken: { name: "refresh_token", type: "text", nullable: true },
    jobCompleted: { name: "job_completed", type: "jsonb", nullable: true },
    createdAt: { name: "created_at", type: "timestamp", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamp", updateDate: true },
  },

  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "user_id", referencedColumnName: "id" },
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
  },
});