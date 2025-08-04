# Deployment Notes - MVP Version

## Temporarily Disabled Features for MVP

To get the MVP deployed quickly, the following features have been temporarily simplified or disabled:

### 1. AI Features (Gracefully Disabled)
- ✅ **Worry Analysis**: Uses fallback keyword-based analysis
- ✅ **Content Moderation**: Uses rule-based moderation only
- ✅ **Smart Notifications**: Uses predefined message templates
- ✅ **Exercise Recommendations**: Uses static recommendations

### 2. Complex Analytics (Simplified)
- ⚠️ **Demographic Analytics**: May have array handling issues
- ⚠️ **Keyword Analysis**: Simplified for SQL Server string format

### 3. Array Fields (SQL Server Compatibility)
- ⚠️ Some array fields converted to comma-separated strings
- ⚠️ May need additional fixes for complex queries

## Core Features Working
- ✅ User registration and authentication
- ✅ Post creation and viewing
- ✅ User profiles and following
- ✅ Basic privacy controls
- ✅ Subscription system (payments disabled)
- ✅ Health checks and monitoring

## Post-MVP Improvements Needed
1. Fix array handling for SQL Server
2. Implement proper AI integration
3. Complete analytics features
4. Add comprehensive error handling
5. Optimize database queries

## Environment Variables for Deployment
```
NODE_ENV=production
PORT=10000
DATABASE_URL=your-azure-sql-connection-string
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
DISABLE_PAYMENTS=true
FRONTEND_URL=https://your-frontend-url
```

## Quick Test Commands
```bash
# Test build
npm run build

# Test start (after build)
npm start

# Test health check
curl http://localhost:5000/api/health
```