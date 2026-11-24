import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payments" ADD COLUMN "ip_hash" varchar;
  CREATE INDEX "payments_ip_hash_idx" ON "payments" USING btree ("ip_hash");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "payments_ip_hash_idx";
  ALTER TABLE "payments" DROP COLUMN "ip_hash";`)
}
