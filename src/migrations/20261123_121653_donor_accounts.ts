import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "donor_login_tokens" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"token_hash" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"used_at" timestamp(3) with time zone,
  	"ip_hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "donor_login_tokens_id" integer;
  CREATE UNIQUE INDEX "donor_login_tokens_token_hash_idx" ON "donor_login_tokens" USING btree ("token_hash");
  CREATE INDEX "donor_login_tokens_email_idx" ON "donor_login_tokens" USING btree ("email");
  CREATE INDEX "donor_login_tokens_ip_hash_idx" ON "donor_login_tokens" USING btree ("ip_hash");
  CREATE INDEX "donor_login_tokens_updated_at_idx" ON "donor_login_tokens" USING btree ("updated_at");
  CREATE INDEX "donor_login_tokens_created_at_idx" ON "donor_login_tokens" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_donor_login_tokens_fk" FOREIGN KEY ("donor_login_tokens_id") REFERENCES "public"."donor_login_tokens"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_donor_login_tokens_id_idx" ON "payload_locked_documents_rels" USING btree ("donor_login_tokens_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "donor_login_tokens" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "donor_login_tokens" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_donor_login_tokens_fk";
  
  DROP INDEX "payload_locked_documents_rels_donor_login_tokens_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "donor_login_tokens_id";`)
}
