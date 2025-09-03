-- Add location fields to users table
ALTER TABLE "users" ADD COLUMN "country" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "region" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "city" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN "location_sharing" BOOLEAN NOT NULL DEFAULT false;

-- Create geographic_analytics table
CREATE TABLE "geographic_analytics" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "sentiment" DECIMAL(5,2) NOT NULL,
    "count" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geographic_analytics_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX "geographic_analytics_country_region_category_period_periodType_key" ON "geographic_analytics"("country", "region", "category", "period", "periodType");
CREATE UNIQUE INDEX "geographic_analytics_country_category_period_periodType_key" ON "geographic_analytics"("country", "category", "period", "periodType") WHERE "region" IS NULL;