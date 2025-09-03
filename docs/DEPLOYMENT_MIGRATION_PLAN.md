# Deployment Migration Plan - User Experience Improvements

This document outlines the complete deployment migration plan for the User Experience Improvements feature set, including database migrations, rollback procedures, and verification steps.

## Overview

The User Experience Improvements feature set includes:
- Enhanced support system (terminology changes from "likes" to "support")
- MeToo functionality for similar worry responses
- User following system
- Profile picture management with Cloudinary integration

## Pre-Deployment Checklist

### Environment Preparation

- [ ] **Database Backup**: Create full database backup before migration
- [ ] **Environment Variables**: Verify all required environment variables are set
- [ ] **Cloudinary Setup**: Ensure Cloudinary credentials are configured
- [ ] **Dependencies**: Verify all npm packages are installed and up to date
- [ ] **Test Environment**: Run full migration on staging environment first

### Required Environment Variables

```bash
# Cloudinary Configuration (New)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Existing Variables (Verify)
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

## Migration Steps

### Step 1: Database Schema Migration

The database migration has already been created at:
`backend/prisma/migrations/20250825_add_user_experience_features/migration.sql`

**Current Migration Status:**
- ✅ `me_too` table created
- ✅ Profile picture timestamp added to users table
- ❌ Missing: `follows` table (needs to be added)
- ❌ Missing: Cloudinary ID field for users

**Additional Migration Required:**

Create a new migration file: `backend/prisma/migrations/20250826_complete_user_experience_features/migration.sql`

```sql
-- Add missing Cloudinary field to users table
ALTER TABLE "users" ADD COLUMN "profile_picture_cloudinary_id" TEXT;

-- CreateTable for follows (if not exists)
CREATE TABLE IF NOT EXISTS "follows" (
    "id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "follows_follower_id_idx" ON "follows"("follower_id");
CREATE INDEX IF NOT EXISTS "follows_following_id_idx" ON "follows"("following_id");
CREATE UNIQUE INDEX IF NOT EXISTS "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");

-- AddForeignKey
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
```

**Migration Commands:**

```bash
# Navigate to backend directory
cd backend

# Generate and apply migration
npx prisma migrate deploy

# Verify migration
npx prisma db pull
npx prisma generate
```

### Step 2: Backend Deployment

**Deployment Order:**
1. Deploy backend services first
2. Run database migrations
3. Verify API endpoints
4. Deploy frontend

**Backend Deployment Commands:**

```bash
# Install dependencies
npm ci --production

# Build application
npm run build

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Start application
npm start
```

### Step 3: Frontend Deployment

**Frontend Deployment Commands:**

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm ci --production

# Build application
npm run build

# Deploy built files to web server
# (Copy dist/ folder to web server)
```

### Step 4: Verification Procedures

After deployment, verify each feature works correctly:

#### API Endpoint Verification

```bash
# Test MeToo endpoints
curl -X GET "https://your-domain.com/api/metoo/test-post-id/count"
curl -X POST "https://your-domain.com/api/metoo/test-post-id" \
  -H "Authorization: Bearer test-token"

# Test Follow endpoints
curl -X GET "https://your-domain.com/api/follows/test-user-id/stats"
curl -X POST "https://your-domain.com/api/follows/test-user-id" \
  -H "Authorization: Bearer test-token"

# Test Profile Picture endpoints
curl -X GET "https://your-domain.com/api/profile-picture/test-user-id"

# Test Support endpoints (enhanced likes)
curl -X GET "https://your-domain.com/api/likes/test-post-id/count"
curl -X POST "https://your-domain.com/api/likes/test-post-id" \
  -H "Authorization: Bearer test-token"
```

#### Database Verification

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('me_too', 'follows');

-- Verify indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('me_too', 'follows');

-- Verify foreign key constraints
SELECT conname FROM pg_constraint 
WHERE conrelid IN (
  SELECT oid FROM pg_class 
  WHERE relname IN ('me_too', 'follows')
);

-- Test data integrity
SELECT COUNT(*) FROM me_too;
SELECT COUNT(*) FROM follows;
```

#### Frontend Verification

- [ ] MeToo buttons appear on posts
- [ ] Follow buttons work on user profiles
- [ ] Profile picture upload functions correctly
- [ ] Support terminology displays correctly (not "likes")
- [ ] All new components render without errors

## Rollback Procedures

### Emergency Rollback (Complete)

If critical issues are discovered, perform complete rollback:

```bash
# 1. Restore database from backup
pg_restore --clean --no-acl --no-owner -h localhost -U username -d database_name backup_file.sql

# 2. Deploy previous version of backend
git checkout previous-stable-tag
npm ci --production
npm run build
npm start

# 3. Deploy previous version of frontend
git checkout previous-stable-tag
cd frontend
npm ci --production
npm run build
# Deploy dist/ folder
```

### Partial Rollback (Feature-Specific)

If only specific features need to be disabled:

#### Disable MeToo Feature

```sql
-- Temporarily disable MeToo endpoints by removing data
-- (Keep table structure for future re-enable)
UPDATE me_too SET created_at = created_at WHERE false; -- No-op to test
-- Or truncate if needed: TRUNCATE TABLE me_too;
```

#### Disable Follow Feature

```sql
-- Temporarily disable Follow endpoints
-- TRUNCATE TABLE follows; -- If needed
```

#### Disable Profile Picture Feature

```bash
# Remove Cloudinary environment variables
unset CLOUDINARY_CLOUD_NAME
unset CLOUDINARY_API_KEY
unset CLOUDINARY_API_SECRET

# Restart backend service
pm2 restart backend
```

### Database Schema Rollback

**Rollback Migration Script:** `rollback_user_experience_features.sql`

```sql
-- Remove foreign key constraints
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

-- Drop tables
DROP TABLE IF EXISTS "follows";
DROP TABLE IF EXISTS "me_too";

-- Remove added columns
ALTER TABLE "users" DROP COLUMN IF EXISTS "profile_picture_cloudinary_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "profile_picture_updated_at";
```

## Monitoring and Health Checks

### Post-Deployment Monitoring

Monitor these metrics after deployment:

#### Application Metrics
- API response times for new endpoints
- Error rates for MeToo, Follow, and Profile Picture operations
- Database query performance
- Cloudinary upload success rates

#### Database Metrics
- Connection pool usage
- Query execution times
- Lock contention on new tables
- Storage usage increase

#### User Experience Metrics
- Feature adoption rates
- User engagement with new functionality
- Error reports from frontend

### Health Check Endpoints

Add these health checks to your monitoring:

```bash
# API Health
curl -f https://your-domain.com/api/health

# Database Health
curl -f https://your-domain.com/api/health/database

# Cloudinary Health
curl -f https://your-domain.com/api/health/cloudinary
```

### Alerting Thresholds

Set up alerts for:
- API error rate > 5% for new endpoints
- Database query time > 1000ms for new tables
- Cloudinary upload failure rate > 10%
- Frontend JavaScript errors related to new components

## Performance Considerations

### Database Performance

- **Indexing**: Ensure proper indexes on foreign keys and frequently queried columns
- **Connection Pooling**: Monitor connection pool usage with new endpoints
- **Query Optimization**: Review query plans for new operations

### Cloudinary Performance

- **Image Optimization**: Implement proper image resizing and compression
- **CDN Caching**: Ensure Cloudinary CDN is properly configured
- **Upload Limits**: Implement proper file size and type validation

### Frontend Performance

- **Bundle Size**: Monitor JavaScript bundle size increase
- **Lazy Loading**: Implement lazy loading for new components
- **Caching**: Ensure proper caching of API responses

## Security Considerations

### Data Protection

- **User Privacy**: Ensure follow relationships respect privacy settings
- **Image Security**: Validate uploaded images for malicious content
- **Rate Limiting**: Implement proper rate limiting on new endpoints

### Access Control

- **Authentication**: Verify JWT token validation on all new endpoints
- **Authorization**: Ensure users can only access their own data
- **CORS**: Update CORS settings if needed for new endpoints

## Testing Checklist

### Pre-Deployment Testing

- [ ] Unit tests pass for all new components
- [ ] Integration tests pass for all workflows
- [ ] Database migration tests pass
- [ ] API endpoint tests pass
- [ ] Frontend component tests pass

### Post-Deployment Testing

- [ ] Smoke tests on production environment
- [ ] User acceptance testing for key workflows
- [ ] Performance testing under load
- [ ] Security testing for new endpoints

## Documentation Updates

After successful deployment:

- [ ] Update API documentation with new endpoints
- [ ] Update user documentation with new features
- [ ] Update developer documentation with schema changes
- [ ] Update deployment documentation with lessons learned

## Support and Troubleshooting

### Common Issues and Solutions

#### Migration Failures

**Issue**: Migration fails due to existing data conflicts
**Solution**: 
```sql
-- Check for conflicting data
SELECT * FROM users WHERE profile_picture_cloudinary_id IS NOT NULL;
-- Clean up if necessary before re-running migration
```

#### Cloudinary Connection Issues

**Issue**: Profile picture uploads fail
**Solution**:
```bash
# Verify environment variables
echo $CLOUDINARY_CLOUD_NAME
echo $CLOUDINARY_API_KEY
# Test connection manually
curl -X POST "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME/image/upload" \
  -F "file=@test.jpg" \
  -F "api_key=$CLOUDINARY_API_KEY" \
  -F "api_secret=$CLOUDINARY_API_SECRET"
```

#### Frontend Component Errors

**Issue**: New components not rendering
**Solution**:
- Check browser console for JavaScript errors
- Verify API endpoints are accessible
- Check network tab for failed requests

### Emergency Contacts

- **Database Administrator**: [Contact Info]
- **DevOps Engineer**: [Contact Info]
- **Frontend Developer**: [Contact Info]
- **Backend Developer**: [Contact Info]

## Success Criteria

Deployment is considered successful when:

- [ ] All database migrations complete without errors
- [ ] All API endpoints respond correctly
- [ ] Frontend components render and function properly
- [ ] No increase in error rates or performance degradation
- [ ] User acceptance testing passes
- [ ] Monitoring shows healthy metrics

## Timeline

**Estimated Deployment Time**: 2-4 hours

- **Preparation**: 30 minutes
- **Database Migration**: 15 minutes
- **Backend Deployment**: 30 minutes
- **Frontend Deployment**: 30 minutes
- **Verification**: 60 minutes
- **Monitoring Setup**: 30 minutes
- **Buffer Time**: 45 minutes

## Post-Deployment Tasks

Within 24 hours of deployment:

- [ ] Monitor error rates and performance metrics
- [ ] Collect user feedback on new features
- [ ] Review logs for any unexpected issues
- [ ] Update documentation based on deployment experience
- [ ] Plan next iteration improvements

Within 1 week of deployment:

- [ ] Analyze feature adoption metrics
- [ ] Optimize performance based on real usage patterns
- [ ] Address any user-reported issues
- [ ] Plan feature enhancements based on feedback