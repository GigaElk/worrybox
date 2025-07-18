/*
  Warnings:

  - You are about to drop the column `community_interactions` on the `notification_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `supportive_messages` on the `notification_preferences` table. All the data in the column will be lost.
  - You are about to drop the `user_notifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_notifications" DROP CONSTRAINT "user_notifications_user_id_fkey";

-- AlterTable
ALTER TABLE "notification_preferences" DROP COLUMN "community_interactions",
DROP COLUMN "supportive_messages",
ADD COLUMN     "email_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "push_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "support_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC',
ALTER COLUMN "quiet_hours_start" DROP NOT NULL,
ALTER COLUMN "quiet_hours_start" DROP DEFAULT,
ALTER COLUMN "quiet_hours_end" DROP NOT NULL,
ALTER COLUMN "quiet_hours_end" DROP DEFAULT;

-- DropTable
DROP TABLE "user_notifications";

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "scheduled_for" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
