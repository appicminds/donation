import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_media_origin" AS ENUM('family', 'visitor');
  ALTER TABLE "memories" ADD COLUMN "ip_hash" varchar;
  ALTER TABLE "media" ADD COLUMN "origin" "enum_media_origin" DEFAULT 'family';
  ALTER TABLE "media" ADD COLUMN "visitor_name" varchar;
  ALTER TABLE "media" ADD COLUMN "visitor_email" varchar;
  ALTER TABLE "media" ADD COLUMN "visitor_consent" boolean;
  ALTER TABLE "media" ADD COLUMN "rights_attested" boolean;
  ALTER TABLE "media" ADD COLUMN "ip_hash" varchar;
  ALTER TABLE "contact_messages" ADD COLUMN "ip_hash" varchar;
  CREATE INDEX "memories_ip_hash_idx" ON "memories" USING btree ("ip_hash");
  CREATE INDEX "media_ip_hash_idx" ON "media" USING btree ("ip_hash");
  CREATE INDEX "contact_messages_ip_hash_idx" ON "contact_messages" USING btree ("ip_hash");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "memories_ip_hash_idx";
  DROP INDEX "media_ip_hash_idx";
  DROP INDEX "contact_messages_ip_hash_idx";
  ALTER TABLE "memories" DROP COLUMN "ip_hash";
  ALTER TABLE "media" DROP COLUMN "origin";
  ALTER TABLE "media" DROP COLUMN "visitor_name";
  ALTER TABLE "media" DROP COLUMN "visitor_email";
  ALTER TABLE "media" DROP COLUMN "visitor_consent";
  ALTER TABLE "media" DROP COLUMN "rights_attested";
  ALTER TABLE "media" DROP COLUMN "ip_hash";
  ALTER TABLE "contact_messages" DROP COLUMN "ip_hash";
  DROP TYPE "public"."enum_media_origin";`)
}
