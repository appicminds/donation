import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_memories_status" AS ENUM('pending', 'approved', 'rejected', 'hidden', 'removed');
  CREATE TYPE "public"."enum_media_approval_status" AS ENUM('pending', 'approved', 'rejected', 'removed');
  CREATE TYPE "public"."enum_contact_messages_topic" AS ENUM('memorial', 'payment', 'general');
  CREATE TYPE "public"."enum_contact_messages_status" AS ENUM('new', 'in_progress', 'resolved');
  CREATE TYPE "public"."enum_users_roles" AS ENUM('super_admin', 'publisher', 'editor', 'legal_approver', 'moderator', 'finance', 'support');
  CREATE TYPE "public"."enum_homepage_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__homepage_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_legacy_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__legacy_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "memories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"summary" varchar,
  	"name" varchar,
  	"relationship" varchar,
  	"message" varchar NOT NULL,
  	"photo_id" integer,
  	"email" varchar,
  	"public_consent" boolean DEFAULT false,
  	"show_name" boolean DEFAULT false,
  	"status" "enum_memories_status" DEFAULT 'pending' NOT NULL,
  	"moderation_reason" varchar,
  	"reviewed_by_id" integer,
  	"reviewed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"caption" varchar,
  	"rights_confirmed" boolean DEFAULT false,
  	"approval_status" "enum_media_approval_status" DEFAULT 'pending' NOT NULL,
  	"show_in_gallery" boolean DEFAULT false,
  	"sort_order" numeric DEFAULT 100,
  	"reviewed_by_id" integer,
  	"reviewed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar
  );
  
  CREATE TABLE "contact_messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"email" varchar NOT NULL,
  	"topic" "enum_contact_messages_topic" NOT NULL,
  	"message" varchar NOT NULL,
  	"status" "enum_contact_messages_status" DEFAULT 'new',
  	"internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"totp_secret" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"actor_id" integer,
  	"actor_label" varchar,
  	"action" varchar NOT NULL,
  	"entity" varchar NOT NULL,
  	"entity_id" varchar,
  	"fields" jsonb,
  	"summary" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "totp_attempts" (
  	"id" varchar PRIMARY KEY NOT NULL,
  	"attempts" numeric DEFAULT 0 NOT NULL,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"memories_id" integer,
  	"media_id" integer,
  	"contact_messages_id" integer,
  	"users_id" integer,
  	"audit_logs_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "homepage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"remembering_eyebrow" varchar DEFAULT 'Remembering Comfort',
  	"remembering_title" varchar DEFAULT 'A Life of Grace, Love and Kindness',
  	"remembering_body" varchar DEFAULT 'Comfort Kwaw will forever be remembered with love and gratitude. Through the memories shared by family, friends, and all those whose lives she touched, her light continues to shine.',
  	"legacy_eyebrow" varchar DEFAULT 'Her Eternal Legacy',
  	"legacy_title" varchar DEFAULT 'A Legacy That Continues to Inspire',
  	"legacy_body" varchar DEFAULT 'Comfort Kwaw was deeply loved and will always hold a special place in the hearts of her family and those who knew her. We remember her with gratitude, honor her with love, and cherish the moments that made her life so meaningful.',
  	"purpose_eyebrow" varchar DEFAULT 'The Purpose Behind Her Legacy',
  	"purpose_title" varchar DEFAULT 'Turning Love Into Hope',
  	"purpose_body" varchar DEFAULT 'In remembering Comfort, her family hopes to create something meaningful beyond memories. Her legacy inspires a commitment to helping deserving individuals and families facing difficult medical circumstances, so that others may find hope and support when they need it most.',
  	"honor_title" varchar DEFAULT 'Honor Her Memory',
  	"honor_body" varchar DEFAULT 'Honor the memory of Comfort Kwaw with a heartfelt gift. Every expression of love and remembrance is deeply appreciated.',
  	"memories_title" varchar DEFAULT 'Memories & Messages',
  	"memories_body" varchar DEFAULT 'Share a cherished memory, a kind word, or a heartfelt message as we remember Comfort together.',
  	"memories_empty" varchar DEFAULT 'Messages of love and remembrance will appear here.',
  	"gallery_title" varchar DEFAULT 'Photo Gallery',
  	"gallery_body" varchar DEFAULT 'A collection of meaningful moments celebrating the life of Comfort Kwaw.',
  	"gallery_empty" varchar DEFAULT 'Photographs and memories will be added with the family’s permission.',
  	"final_cta_title" varchar DEFAULT 'Forever Comfort. Forever Loved.',
  	"final_cta_body" varchar DEFAULT 'Join us in remembering a remarkable woman whose love will always remain with us.',
  	"_status" "enum_homepage_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_homepage_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_remembering_eyebrow" varchar DEFAULT 'Remembering Comfort',
  	"version_remembering_title" varchar DEFAULT 'A Life of Grace, Love and Kindness',
  	"version_remembering_body" varchar DEFAULT 'Comfort Kwaw will forever be remembered with love and gratitude. Through the memories shared by family, friends, and all those whose lives she touched, her light continues to shine.',
  	"version_legacy_eyebrow" varchar DEFAULT 'Her Eternal Legacy',
  	"version_legacy_title" varchar DEFAULT 'A Legacy That Continues to Inspire',
  	"version_legacy_body" varchar DEFAULT 'Comfort Kwaw was deeply loved and will always hold a special place in the hearts of her family and those who knew her. We remember her with gratitude, honor her with love, and cherish the moments that made her life so meaningful.',
  	"version_purpose_eyebrow" varchar DEFAULT 'The Purpose Behind Her Legacy',
  	"version_purpose_title" varchar DEFAULT 'Turning Love Into Hope',
  	"version_purpose_body" varchar DEFAULT 'In remembering Comfort, her family hopes to create something meaningful beyond memories. Her legacy inspires a commitment to helping deserving individuals and families facing difficult medical circumstances, so that others may find hope and support when they need it most.',
  	"version_honor_title" varchar DEFAULT 'Honor Her Memory',
  	"version_honor_body" varchar DEFAULT 'Honor the memory of Comfort Kwaw with a heartfelt gift. Every expression of love and remembrance is deeply appreciated.',
  	"version_memories_title" varchar DEFAULT 'Memories & Messages',
  	"version_memories_body" varchar DEFAULT 'Share a cherished memory, a kind word, or a heartfelt message as we remember Comfort together.',
  	"version_memories_empty" varchar DEFAULT 'Messages of love and remembrance will appear here.',
  	"version_gallery_title" varchar DEFAULT 'Photo Gallery',
  	"version_gallery_body" varchar DEFAULT 'A collection of meaningful moments celebrating the life of Comfort Kwaw.',
  	"version_gallery_empty" varchar DEFAULT 'Photographs and memories will be added with the family’s permission.',
  	"version_final_cta_title" varchar DEFAULT 'Forever Comfort. Forever Loved.',
  	"version_final_cta_body" varchar DEFAULT 'Join us in remembering a remarkable woman whose love will always remain with us.',
  	"version__status" "enum__homepage_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "legacy_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'Her Eternal Legacy',
  	"opening" varchar DEFAULT 'A life of love, faith, and grace. A memory treasured forever.',
  	"story" varchar DEFAULT 'Comfort Kwaw was deeply loved and will always hold a special place in the hearts of her family and those who knew her. We remember her with gratitude, honor her with love, and cherish the moments that made her life so meaningful.',
  	"closing" varchar DEFAULT 'Though we miss her presence, the love she shared remains part of us. Forever Comfort. Forever loved. Forever remembered.',
  	"_status" "enum_legacy_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_legacy_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_title" varchar DEFAULT 'Her Eternal Legacy',
  	"version_opening" varchar DEFAULT 'A life of love, faith, and grace. A memory treasured forever.',
  	"version_story" varchar DEFAULT 'Comfort Kwaw was deeply loved and will always hold a special place in the hearts of her family and those who knew her. We remember her with gratitude, honor her with love, and cherish the moments that made her life so meaningful.',
  	"version_closing" varchar DEFAULT 'Though we miss her presence, the love she shared remains part of us. Forever Comfort. Forever loved. Forever remembered.',
  	"version__status" "enum__legacy_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "site_settings_notification_recipients" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"payments_enabled" boolean DEFAULT false,
  	"payments_enable_requested_by_id" integer,
  	"gbp_enabled" boolean DEFAULT true,
  	"recurring_enabled" boolean DEFAULT false,
  	"mission_copy_approved" boolean DEFAULT false,
  	"memory_submissions_enabled" boolean DEFAULT false,
  	"photo_submissions_enabled" boolean DEFAULT false,
  	"contact_form_enabled" boolean DEFAULT false,
  	"custom_amount_min" numeric DEFAULT 1 NOT NULL,
  	"custom_amount_max" numeric DEFAULT 10000 NOT NULL,
  	"support_email" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "memories" ADD CONSTRAINT "memories_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "memories" ADD CONSTRAINT "memories_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_memories_fk" FOREIGN KEY ("memories_id") REFERENCES "public"."memories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_messages_fk" FOREIGN KEY ("contact_messages_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_logs_fk" FOREIGN KEY ("audit_logs_id") REFERENCES "public"."audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_notification_recipients" ADD CONSTRAINT "site_settings_notification_recipients_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_payments_enable_requested_by_id_users_id_fk" FOREIGN KEY ("payments_enable_requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "memories_photo_idx" ON "memories" USING btree ("photo_id");
  CREATE INDEX "memories_reviewed_by_idx" ON "memories" USING btree ("reviewed_by_id");
  CREATE INDEX "memories_updated_at_idx" ON "memories" USING btree ("updated_at");
  CREATE INDEX "memories_created_at_idx" ON "memories" USING btree ("created_at");
  CREATE INDEX "media_reviewed_by_idx" ON "media" USING btree ("reviewed_by_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE INDEX "contact_messages_updated_at_idx" ON "contact_messages" USING btree ("updated_at");
  CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages" USING btree ("created_at");
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");
  CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
  CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity");
  CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs" USING btree ("entity_id");
  CREATE INDEX "audit_logs_updated_at_idx" ON "audit_logs" USING btree ("updated_at");
  CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_memories_id_idx" ON "payload_locked_documents_rels" USING btree ("memories_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_contact_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_messages_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_logs_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "homepage__status_idx" ON "homepage" USING btree ("_status");
  CREATE INDEX "_homepage_v_version_version__status_idx" ON "_homepage_v" USING btree ("version__status");
  CREATE INDEX "_homepage_v_created_at_idx" ON "_homepage_v" USING btree ("created_at");
  CREATE INDEX "_homepage_v_updated_at_idx" ON "_homepage_v" USING btree ("updated_at");
  CREATE INDEX "_homepage_v_latest_idx" ON "_homepage_v" USING btree ("latest");
  CREATE INDEX "legacy_page__status_idx" ON "legacy_page" USING btree ("_status");
  CREATE INDEX "_legacy_page_v_version_version__status_idx" ON "_legacy_page_v" USING btree ("version__status");
  CREATE INDEX "_legacy_page_v_created_at_idx" ON "_legacy_page_v" USING btree ("created_at");
  CREATE INDEX "_legacy_page_v_updated_at_idx" ON "_legacy_page_v" USING btree ("updated_at");
  CREATE INDEX "_legacy_page_v_latest_idx" ON "_legacy_page_v" USING btree ("latest");
  CREATE INDEX "site_settings_notification_recipients_order_idx" ON "site_settings_notification_recipients" USING btree ("_order");
  CREATE INDEX "site_settings_notification_recipients_parent_id_idx" ON "site_settings_notification_recipients" USING btree ("_parent_id");
  CREATE INDEX "site_settings_payments_enable_requested_by_idx" ON "site_settings" USING btree ("payments_enable_requested_by_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "memories" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "contact_messages" CASCADE;
  DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "audit_logs" CASCADE;
  DROP TABLE "totp_attempts" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "homepage" CASCADE;
  DROP TABLE "_homepage_v" CASCADE;
  DROP TABLE "legacy_page" CASCADE;
  DROP TABLE "_legacy_page_v" CASCADE;
  DROP TABLE "site_settings_notification_recipients" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TYPE "public"."enum_memories_status";
  DROP TYPE "public"."enum_media_approval_status";
  DROP TYPE "public"."enum_contact_messages_topic";
  DROP TYPE "public"."enum_contact_messages_status";
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_homepage_status";
  DROP TYPE "public"."enum__homepage_v_version_status";
  DROP TYPE "public"."enum_legacy_page_status";
  DROP TYPE "public"."enum__legacy_page_v_version_status";`);
}
