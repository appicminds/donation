import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_donor_login_tokens_kind" AS ENUM('signin', 'password-failure');
  CREATE TABLE "donors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"name" varchar,
  	"password_hash" varchar,
  	"password_set_at" timestamp(3) with time zone,
  	"failed_password_attempts" numeric DEFAULT 0,
  	"password_locked_until" timestamp(3) with time zone,
  	"last_sign_in_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "donor_login_tokens" ADD COLUMN "code_hash" varchar;
  ALTER TABLE "donor_login_tokens" ADD COLUMN "code_attempts" numeric DEFAULT 0;
  ALTER TABLE "donor_login_tokens" ADD COLUMN "kind" "enum_donor_login_tokens_kind" DEFAULT 'signin';
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "donors_id" integer;
  CREATE UNIQUE INDEX "donors_email_idx" ON "donors" USING btree ("email");
  CREATE INDEX "donors_updated_at_idx" ON "donors" USING btree ("updated_at");
  CREATE INDEX "donors_created_at_idx" ON "donors" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_donors_fk" FOREIGN KEY ("donors_id") REFERENCES "public"."donors"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "donor_login_tokens_kind_idx" ON "donor_login_tokens" USING btree ("kind");
  CREATE INDEX "payload_locked_documents_rels_donors_id_idx" ON "payload_locked_documents_rels" USING btree ("donors_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "donors" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "donors" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_donors_fk";
  
  DROP INDEX "donor_login_tokens_kind_idx";
  DROP INDEX "payload_locked_documents_rels_donors_id_idx";
  ALTER TABLE "donor_login_tokens" DROP COLUMN "code_hash";
  ALTER TABLE "donor_login_tokens" DROP COLUMN "code_attempts";
  ALTER TABLE "donor_login_tokens" DROP COLUMN "kind";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "donors_id";
  DROP TYPE "public"."enum_donor_login_tokens_kind";`)
}
