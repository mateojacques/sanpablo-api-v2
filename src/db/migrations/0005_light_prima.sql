CREATE TYPE "public"."carousel_type" AS ENUM('manual', 'category');--> statement-breakpoint
CREATE TABLE "carousel_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carousel_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carousels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"type" "carousel_type" DEFAULT 'manual' NOT NULL,
	"category_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "carousels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "carousel_items" ADD CONSTRAINT "carousel_items_carousel_id_carousels_id_fk" FOREIGN KEY ("carousel_id") REFERENCES "public"."carousels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carousel_items" ADD CONSTRAINT "carousel_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carousels" ADD CONSTRAINT "carousels_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_carousel_items_carousel" ON "carousel_items" USING btree ("carousel_id");--> statement-breakpoint
CREATE INDEX "idx_carousel_items_product" ON "carousel_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_carousel_items_sort_order" ON "carousel_items" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "idx_carousels_slug" ON "carousels" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_carousels_sort_order" ON "carousels" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "idx_carousels_active" ON "carousels" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_carousels_category" ON "carousels" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_carousels_type" ON "carousels" USING btree ("type");