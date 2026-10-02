CREATE TABLE "card_images" (
	"id" text PRIMARY KEY NOT NULL,
	"mime_type" text NOT NULL,
	"image_data" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
