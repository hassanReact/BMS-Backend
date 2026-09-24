/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

/**
 * @class
 * @implements {MigrationInterface}
 */
export class AddAgentRelationToComplaints1789997132804 {
    name = 'AddAgentRelationToComplaints1789997132804'

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "complaints" ADD "agent_id" uuid`);
        await queryRunner.query(`ALTER TABLE "complaints" ADD CONSTRAINT "FK_ef72ccd2d44209469cebaaa4bfd" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "complaints" DROP CONSTRAINT "FK_ef72ccd2d44209469cebaaa4bfd"`);
        await queryRunner.query(`ALTER TABLE "complaints" DROP COLUMN "agent_id"`);
    }
}
