import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "gbp_to_usd_rate" numeric;
  ALTER TABLE "site_settings" ADD COLUMN "fx_rate_source" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "fx_rate_as_of" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "gbp_to_usd_rate";
  ALTER TABLE "site_settings" DROP COLUMN "fx_rate_source";
  ALTER TABLE "site_settings" DROP COLUMN "fx_rate_as_of";`)
}
