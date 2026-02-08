ALTER TABLE "import_jobs" ADD COLUMN "type" varchar(20) DEFAULT 'csv' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_import_jobs_type" ON "import_jobs" USING btree ("type");