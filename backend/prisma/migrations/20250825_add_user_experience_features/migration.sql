-- CreateTable
CREATE TABLE "me_too" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "me_too_pkey" PRIMARY KEY ("id")
);

-- Add profile picture timestamp to users table
ALTER TABLE "users" ADD COLUMN "profile_picture_updated_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "me_too_post_id_idx" ON "me_too"("post_id");

-- CreateIndex
CREATE INDEX "me_too_user_id_idx" ON "me_too"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "me_too_user_id_post_id_key" ON "me_too"("user_id", "post_id");

-- AddForeignKey
ALTER TABLE "me_too" ADD CONSTRAINT "me_too_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "me_too" ADD CONSTRAINT "me_too_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;