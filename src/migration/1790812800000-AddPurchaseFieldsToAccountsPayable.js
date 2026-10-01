export class addPurchaseFieldsToAccountsPayable1790812800000 {
  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "accounts_payable"
      ADD COLUMN "purchase_detail_id" uuid,
      ADD COLUMN "product_name" character varying,
      ADD COLUMN "vendor_name" character varying,
      ADD COLUMN "unit" character varying,
      ADD COLUMN "quantity" numeric,
      ADD COLUMN "unit_per_price" numeric,
      ADD COLUMN "bill" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "accounts_payable"
      ADD CONSTRAINT "FK_accounts_payable_purchase_detail"
      FOREIGN KEY ("purchase_detail_id")
      REFERENCES "purchase_details"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "accounts_payable"
      DROP CONSTRAINT "FK_accounts_payable_purchase_detail"
    `);

    await queryRunner.query(`
      ALTER TABLE "accounts_payable"
      DROP COLUMN "purchase_detail_id",
      DROP COLUMN "product_name",
      DROP COLUMN "vendor_name",
      DROP COLUMN "unit",
      DROP COLUMN "quantity",
      DROP COLUMN "unit_per_price",
      DROP COLUMN "bill"
    `);
  }
}