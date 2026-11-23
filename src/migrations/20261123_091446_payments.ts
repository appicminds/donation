import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_payments_status" AS ENUM('created', 'requires_payment', 'processing', 'succeeded', 'failed', 'canceled', 'partially_refunded', 'refunded', 'disputed');
  CREATE TYPE "public"."enum_payments_currency" AS ENUM('USD', 'GBP');
  CREATE TYPE "public"."enum_payments_frequency" AS ENUM('one_time');
  CREATE TYPE "public"."enum_payments_refund_request_reason" AS ENUM('requested_by_customer', 'duplicate', 'fraudulent');
  CREATE TABLE "payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"receipt_ref" varchar NOT NULL,
  	"access_token" varchar NOT NULL,
  	"idempotency_key" varchar,
  	"status" "enum_payments_status" DEFAULT 'created' NOT NULL,
  	"amount_minor" numeric NOT NULL,
  	"currency" "enum_payments_currency" NOT NULL,
  	"frequency" "enum_payments_frequency" DEFAULT 'one_time',
  	"donor_email" varchar,
  	"donor_name" varchar,
  	"show_name" boolean DEFAULT false,
  	"memorial_note" varchar,
  	"stripe_payment_intent_id" varchar,
  	"stripe_charge_id" varchar,
  	"livemode" boolean,
  	"failure_message" varchar,
  	"succeeded_at" timestamp(3) with time zone,
  	"last_event_at" timestamp(3) with time zone,
  	"receipt_email_sent_at" timestamp(3) with time zone,
  	"gross_minor" numeric,
  	"fee_minor" numeric,
  	"net_minor" numeric,
  	"settlement_currency" varchar,
  	"fx_rate" numeric,
  	"balance_transaction_id" varchar,
  	"available_on" timestamp(3) with time zone,
  	"refunded_minor" numeric DEFAULT 0,
  	"dispute_id" varchar,
  	"dispute_status" varchar,
  	"dispute_reason" varchar,
  	"dispute_evidence_due_by" timestamp(3) with time zone,
  	"refund_request_amount" numeric,
  	"refund_request_reason" "enum_payments_refund_request_reason",
  	"refund_request_confirm" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "refunds" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"payment_id" integer NOT NULL,
  	"amount_minor" numeric NOT NULL,
  	"currency" varchar NOT NULL,
  	"status" varchar,
  	"reason" varchar,
  	"stripe_refund_id" varchar,
  	"requested_by_id" integer,
  	"notified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payment_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stripe_event_id" varchar NOT NULL,
  	"type" varchar NOT NULL,
  	"payment_id" integer,
  	"livemode" boolean,
  	"verified" boolean DEFAULT true,
  	"outcome" varchar,
  	"object_id" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "refunds_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payment_events_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "legal_recipient" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "payment_classification" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "purpose_disclosure" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "tax_statement" varchar DEFAULT 'This is a payment confirmation, not a charitable tax receipt unless separately stated by an eligible organization.';
  ALTER TABLE "site_settings" ADD COLUMN "refund_policy" varchar;
  ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "payments_receipt_ref_idx" ON "payments" USING btree ("receipt_ref");
  CREATE UNIQUE INDEX "payments_idempotency_key_idx" ON "payments" USING btree ("idempotency_key");
  CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");
  CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_idx" ON "payments" USING btree ("stripe_payment_intent_id");
  CREATE INDEX "payments_stripe_charge_id_idx" ON "payments" USING btree ("stripe_charge_id");
  CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
  CREATE INDEX "refunds_payment_idx" ON "refunds" USING btree ("payment_id");
  CREATE INDEX "refunds_status_idx" ON "refunds" USING btree ("status");
  CREATE UNIQUE INDEX "refunds_stripe_refund_id_idx" ON "refunds" USING btree ("stripe_refund_id");
  CREATE INDEX "refunds_requested_by_idx" ON "refunds" USING btree ("requested_by_id");
  CREATE INDEX "refunds_updated_at_idx" ON "refunds" USING btree ("updated_at");
  CREATE INDEX "refunds_created_at_idx" ON "refunds" USING btree ("created_at");
  CREATE UNIQUE INDEX "payment_events_stripe_event_id_idx" ON "payment_events" USING btree ("stripe_event_id");
  CREATE INDEX "payment_events_type_idx" ON "payment_events" USING btree ("type");
  CREATE INDEX "payment_events_payment_idx" ON "payment_events" USING btree ("payment_id");
  CREATE INDEX "payment_events_updated_at_idx" ON "payment_events" USING btree ("updated_at");
  CREATE INDEX "payment_events_created_at_idx" ON "payment_events" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_refunds_fk" FOREIGN KEY ("refunds_id") REFERENCES "public"."refunds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payment_events_fk" FOREIGN KEY ("payment_events_id") REFERENCES "public"."payment_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");
  CREATE INDEX "payload_locked_documents_rels_refunds_id_idx" ON "payload_locked_documents_rels" USING btree ("refunds_id");
  CREATE INDEX "payload_locked_documents_rels_payment_events_id_idx" ON "payload_locked_documents_rels" USING btree ("payment_events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "refunds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payment_events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payments" CASCADE;
  DROP TABLE "refunds" CASCADE;
  DROP TABLE "payment_events" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_refunds_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payment_events_fk";
  
  DROP INDEX "payload_locked_documents_rels_payments_id_idx";
  DROP INDEX "payload_locked_documents_rels_refunds_id_idx";
  DROP INDEX "payload_locked_documents_rels_payment_events_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "refunds_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payment_events_id";
  ALTER TABLE "site_settings" DROP COLUMN "legal_recipient";
  ALTER TABLE "site_settings" DROP COLUMN "payment_classification";
  ALTER TABLE "site_settings" DROP COLUMN "purpose_disclosure";
  ALTER TABLE "site_settings" DROP COLUMN "tax_statement";
  ALTER TABLE "site_settings" DROP COLUMN "refund_policy";
  DROP TYPE "public"."enum_payments_status";
  DROP TYPE "public"."enum_payments_currency";
  DROP TYPE "public"."enum_payments_frequency";
  DROP TYPE "public"."enum_payments_refund_request_reason";`)
}
