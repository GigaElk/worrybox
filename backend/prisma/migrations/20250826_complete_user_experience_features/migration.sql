-- Complete User Experience Features Migration
-- This migration adds any missing components for the user experience improvements

-- Add missing Cloudinary field to users table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profile_picture_cloudinary_id'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "profile_picture_cloudinary_id" TEXT;
    END IF;
END $$;

-- Ensure follows table exists with correct structure
CREATE TABLE IF NOT EXISTS "follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- Create indexes for follows table
CREATE INDEX IF NOT EXISTS "follows_follower_id_idx" ON "follows"("follower_id");
CREATE INDEX IF NOT EXISTS "follows_following_id_idx" ON "follows"("following_id");
CREATE UNIQUE INDEX IF NOT EXISTS "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");

-- Add foreign key constraints for follows table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'follows_follower_id_fkey'
    ) THEN
        ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" 
        FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'follows_following_id_fkey'
    ) THEN
        ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" 
        FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Verify me_too table exists (should be created by previous migration)
-- Add additional indexes if needed
CREATE INDEX IF NOT EXISTS "me_too_created_at_idx" ON "me_too"("created_at");

-- Add any missing indexes for performance optimization
CREATE INDEX IF NOT EXISTS "users_profile_picture_updated_at_idx" ON "users"("profile_picture_updated_at") WHERE "profile_picture_updated_at" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "posts_user_id_created_at_idx" ON "posts"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "likes_post_id_created_at_idx" ON "likes"("post_id", "created_at");