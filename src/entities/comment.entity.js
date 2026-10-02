import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Comment",
  tableName: "comments",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    complaintId: { name: "complaint_id", type: "uuid", nullable: false },
    companyId: { name: "company_id", type: "uuid", nullable: true },
    senderId: { name: "sender_id", type: "uuid", nullable: false },
    senderRole: {
      name: "sender_role",
      type: "enum",
      enum: ["tenant", "staff", "companyAdmin"],
      nullable: false,
    },
    message: { type: "text", nullable: false },
    readBy: { name: "read_by", type: "jsonb", nullable: true },
    createdAt: { name: "created_at", type: "timestamp", createDate: true },
    updatedAt: { name: "updated_at", type: "timestamp", updateDate: true },
  },

  relations: {
    complaint: {
      type: "many-to-one",
      target: "Complaint",
      joinColumn: { name: "complaint_id", referencedColumnName: "id" },
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