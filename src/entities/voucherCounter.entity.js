import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "VoucherCounter",
  tableName: "voucher_counters",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    prefix: { type: "varchar", nullable: false, unique: true },
    counter: { type: "integer", default: 1, unique: true },
  },
});