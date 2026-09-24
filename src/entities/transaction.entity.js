import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Transaction",
  tableName: "transactions",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    companyId: { name: "company_id", type: "uuid", nullable: true },
    subscriptionId: { name: "subscription_id", type: "uuid", nullable: true },
    amount: { type: "varchar", nullable: true },
    discount: { type: "varchar", nullable: true },
    currency: { type: "varchar", nullable: true },
    transactionDate: {
      name: "transaction_date",
      type: "timestamp",
      default: () => "CURRENT_TIMESTAMP",
    },
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
    subscription: {
      type: "many-to-one",
      target: "Subscription",
      joinColumn: { name: "subscription_id", referencedColumnName: "id" },
      nullable: true,
      onDelete: "SET NULL",
      onUpdate: "NO ACTION",
    },
  },
});