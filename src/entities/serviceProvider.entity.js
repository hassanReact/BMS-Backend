import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "ServiceProvider",
  tableName: "service_providers",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    name: { type: "varchar", nullable: true },
    numOfStaff: { name: "num_of_staff", type: "integer", nullable: true },
    phoneNo: { name: "phone_no", type: "varchar", nullable: true },
    workType: { name: "work_type", type: "varchar", nullable: true },
    monthlyCharges: {
      name: "monthly_charges",
      type: "numeric",
      nullable: true,
    },
    address: { type: "text", nullable: true },
    agreement: { type: "text", nullable: false },
    companyId: { name: "company_id", type: "uuid", nullable: true },
    isDeleted: { name: "is_deleted", type: "boolean", default: false },
    createdAt: { name: "created_at", type: "timestamp", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamp", updateDate: true },
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
  },
});