/*
  Warnings:

  - You are about to drop the column `stripe_subscription_id` on the `subscriptions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[lemonsqueezy_id]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "stripe_subscription_id",
ADD COLUMN     "ends_at" TIMESTAMP(3),
ADD COLUMN     "is_usage_based" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lemonsqueezy_customer_id" TEXT,
ADD COLUMN     "lemonsqueezy_id" TEXT,
ADD COLUMN     "lemonsqueezy_product_id" TEXT,
ADD COLUMN     "lemonsqueezy_variant_id" TEXT,
ADD COLUMN     "renews_at" TIMESTAMP(3),
ADD COLUMN     "subscription_item_id" TEXT,
ADD COLUMN     "trial_ends_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_lemonsqueezy_id_key" ON "subscriptions"("lemonsqueezy_id");
