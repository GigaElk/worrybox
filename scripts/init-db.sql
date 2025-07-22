-- Initialize database with required extensions and settings
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
-- These will be created by Prisma migrations, but we ensure they exist

-- Set timezone
SET timezone = 'UTC';

-- Create backup user (optional, for automated backups)
-- DO $$ 
-- BEGIN
--   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'backup_user') THEN
--     CREATE ROLE backup_user WITH LOGIN PASSWORD 'backup_password';
--     GRANT CONNECT ON DATABASE worrybox_prod TO backup_user;
--     GRANT USAGE ON SCHEMA public TO backup_user;
--     GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
--     ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup_user;
--   END IF;
-- END
-- $$;