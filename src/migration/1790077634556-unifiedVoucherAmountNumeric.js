export class unifiedVoucherAmountNumeric1790077634556 {
   async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "unified_vouchers"
      ALTER COLUMN "amount" TYPE numeric(12,2)
      USING NULL::numeric
    `);

    await queryRunner.query(`
      ALTER TABLE "unified_vouchers"
      ALTER COLUMN "amount" SET NOT NULL
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "unified_vouchers"
      ALTER COLUMN "amount" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "unified_vouchers"
      ALTER COLUMN "amount" TYPE jsonb
      USING to_jsonb(amount)
    `);
  }
}
