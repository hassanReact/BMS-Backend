import { EntitySchema } from "typeorm";

export default new EntitySchema({
  name: "Company",
  tableName: "companies",

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
    companyName: {
      name: "company_name",
      type: "varchar",
      nullable: true,
    },
    email: {
      type: "varchar",
      nullable: true,
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
    role: {
      type: "varchar",
      default: "companyAdmin",
    },
    status: {
      type: "boolean",
      default: true,
    },
    address: {
      type: "text",
      nullable: true,
    },
    gstnumber: {
      type: "varchar",
      nullable: true,
    },
    currencyCode: {
      name: "currency_code",
      type: "varchar",
      nullable: true,
    },
    isDeleted: {
      name: "is_deleted",
      type: "boolean",
      default: false,
    },
    smtpMail: {
      name: "smtp_mail",
      type: "varchar",
      nullable: true,
    },
    smtpCode: {
      name: "smtp_code",
      type: "varchar",
      nullable: true,
    },
    isMailStatus: {
      name: "is_mail_status",
      type: "boolean",
      default: false,
    },
    refreshToken: {
      name: "refresh_token",
      type: "text",
      nullable: true,
    },
    subcriptionId: {
      name: "subcription_id",
      type: "uuid",
      nullable: true,
    },
    subcriptionBuyDate: {
      name: "subcription_buy_date",
      type: "timestamp",
      nullable: true,
    },
    whatappStatus: {
      name: "whatapp_status",
      type: "boolean",
      default: false,
    },
    companyLogo: {
      name: "company_logo",
      type: "varchar",
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
    { name: "IDX_companies_company_name", columns: ["companyName"] },
    { name: "IDX_companies_is_deleted", columns: ["isDeleted"] },
    { name: "IDX_companies_status", columns: ["status"] },
  ],

  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: { name: "user_id", referencedColumnName: "id" },
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION",
    },
    subscription: {
      type: "many-to-one",
      target: "Subscription",
      joinColumn: { name: "subcription_id", referencedColumnName: "id" },
      onDelete: "SET NULL",
      onUpdate: "NO ACTION",
    },
  },
});