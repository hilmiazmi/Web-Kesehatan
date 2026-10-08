CREATE TYPE "public"."admission_status" AS ENUM('pending', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ward_class" AS ENUM('intensive', 'intermediate', 'regular', 'private');--> statement-breakpoint
CREATE TABLE "admissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_code" varchar(24) NOT NULL,
	"patient_name" varchar(160) NOT NULL,
	"nik" varchar(16) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"email" varchar(255),
	"address" text,
	"referral_source" varchar(160),
	"requested_class" "ward_class" NOT NULL,
	"entry_date" date NOT NULL,
	"estimated_nights" integer DEFAULT 1 NOT NULL,
	"complaint" text,
	"payment_type" "payment_type" NOT NULL,
	"status" "admission_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admissions_nik_simulasi" CHECK ("admissions"."nik" ~ '^[0]{16}$'),
	CONSTRAINT "admissions_email_format" CHECK ("admissions"."email" IS NULL OR "admissions"."email" ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
	CONSTRAINT "admissions_nights_positive" CHECK ("admissions"."estimated_nights" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "admissions_ticket_code_unique" ON "admissions" USING btree ("ticket_code");--> statement-breakpoint
CREATE INDEX "admissions_inbox_idx" ON "admissions" USING btree ("status","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "admissions_entry_date_idx" ON "admissions" USING btree ("entry_date" DESC NULLS FIRST);