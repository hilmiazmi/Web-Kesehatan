CREATE TABLE "admin_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_email" varchar(255) NOT NULL,
	"action" varchar(20) NOT NULL,
	"table_name" varchar(80) DEFAULT '' NOT NULL,
	"row_id" uuid,
	"summary" varchar(255) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_audit_action_known" CHECK ("admin_audit"."action" IN ('create','update','delete','status','login','logout','password'))
);
--> statement-breakpoint
ALTER TABLE "admin_audit" ADD CONSTRAINT "admin_audit_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_created_idx" ON "admin_audit" USING btree ("created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "admin_audit_table_idx" ON "admin_audit" USING btree ("table_name","created_at" DESC NULLS FIRST);
