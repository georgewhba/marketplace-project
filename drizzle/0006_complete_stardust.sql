CREATE TABLE "message_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" varchar(10) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"template_key" varchar(100),
	"status" varchar(20) NOT NULL,
	"provider_message_id" varchar(255),
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notif_pref_pk" ON "notification_preferences" USING btree ("user_id","category","channel");