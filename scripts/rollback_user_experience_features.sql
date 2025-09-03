-- Rollback Script for User Experience Features
-- WARNING: This will remove all data related to the new features
-- Make sure to backup your database before running this script

-- Remove foreign key constraints first
ALTER TABLE "follows" DROP CONSTRAINT IF EXISTS "follows_follower_id_fkey";
ALTER TABLE "follows" DROP CONSTRAINT IF EXISTS "follows_following_id_fkey";
ALTER TABLE "me_too" DROP CONSTRAINT IF EXISTS "me_too_user_id_fkey";
ALTER TABLE "me_too" DROP CONSTRAINT IF EXISTS "me_too_post_id_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "follows_follower_id_idx";
DROP INDEX IF EXISTS "follows_following_id_idx";
DROP INDEX IF EXISTS "follows_follower_id_following_id_key";
DROP INDEX IF EXISTS "me_too_post_id_idx";
DROP INDEX IF EXISTS "me_too_user_id_idx";
DROP INDEX IF EXISTS "me_too_user_id_post_id_key";
DROP INDEX IF EXISTS "me_too_created_at_idx";
DROP INDEX IF EXISTS "users_profile_picture_updated_at_idx";
DROP INDEX IF EXISTS "posts_user_id_created_at_idx";
DROP INDEX IF EXISTS "likes_post_id_created_at_idx";

-- Drop tables (this will remove all data!)
DROP TABLE IF EXISTS "follows";
DROP TABLE IF EXISTS "me_too";

-- Remove added columns from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "profile_picture_cloudinary_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "profile_picture_updated_at";

-- Note: This rollback script removes all data for the new features
-- If you need to preserve data, consider backing up the tables first:
-- 
-- CREATE TABLE me_too_backup AS SELECT * FROM me_too;
-- CREATE TABLE follows_backup AS SELECT * FROM follows;
-- 
-- Then you can restore the data later if needed.