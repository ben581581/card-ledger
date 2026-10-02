CREATE TABLE IF NOT EXISTS "ledgers" (
	"id" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
