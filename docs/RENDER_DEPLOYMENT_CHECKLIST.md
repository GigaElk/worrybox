# Render.com Deployment Checklist

## Pre-Deployment Setup

### 1. Code Preparation
- [ ] All code committed and pushed to GitHub
- [ ] Environment variables configured for production
- [ ] Database connection string tested
- [ ] Payment processing disabled (`DISABLE_PAYMENTS=true`)
- [ ] Build scripts verified in package.json

### 2. Database Preparation
- [ ] Azure SQL Database accessible from internet
- [ ] Database seeded with initial data
- [ ] Connection string format verified for Prisma
- [ ] Database migrations tested locally

### 3. Environment Variables Ready
- [ ] `DATABASE_URL` - Azure SQL connection string
- [ ] `JWT_SECRET` - Secure random string (32+ characters)
- [ ] `JWT_REFRESH_SECRET` - Different secure random string
- [ ] `OPENAI_API_KEY` - For AI features (optional for MVP)
- [ ] Email configuration (optional for MVP)

## Backend Deployment

### 1. Create Render.com Web Service
- [ ] Connect GitHub repository
- [ ] Set root directory to `backend`
- [ ] Configure build command: `npm ci && npm run build && npx prisma generate`
- [ ] Configure start command: `npm start`
- [ ] Set environment to Node.js
- [ ] Choose free tier plan

### 2. Environment Variables
- [ ] Add all required environment variables in Render.com dashboard
- [ ] Test database connection
- [ ] Verify JWT secrets are secure
- [ ] Set `DISABLE_PAYMENTS=true` for MVP

### 3. Deployment Verification
- [ ] Build completes successfully
- [ ] Service starts without errors
- [ ] Health check endpoint responds (`/api/health`)
- [ ] Database connection works
- [ ] API endpoints respond correctly

## Frontend Deployment

### 1. Create Render.com Static Site
- [ ] Connect same GitHub repository
- [ ] Set root directory to `frontend`
- [ ] Configure build command: `npm ci && npm run build`
- [ ] Set publish directory to `build`

### 2. Environment Variables
- [ ] Set `REACT_APP_API_URL` to backend URL
- [ ] Set `REACT_APP_ENVIRONMENT=production`

### 3. Deployment Verification
- [ ] Build completes successfully
- [ ] Static site serves correctly
- [ ] Frontend can connect to backend API
- [ ] All pages load without errors
- [ ] Authentication works

## Post-Deployment Testing

### 1. Core Functionality
- [ ] User registration works
- [ ] User login works
- [ ] Password reset works (if email configured)
- [ ] Post creation works
- [ ] Post viewing works
- [ ] User profiles work

### 2. Premium Features (Should work with payments disabled)
- [ ] Personal analytics accessible
- [ ] Demographic analytics accessible
- [ ] All premium features available to all users
- [ ] No payment prompts shown

### 3. Performance
- [ ] Page load times acceptable
- [ ] API response times reasonable
- [ ] No memory leaks or crashes
- [ ] Database queries performing well

## Monitoring Setup

### 1. Health Checks
- [ ] Backend health endpoint monitored
- [ ] Database connectivity monitored
- [ ] Error rates tracked

### 2. Logs
- [ ] Application logs accessible in Render.com dashboard
- [ ] Error logs being captured
- [ ] Performance metrics visible

## Security Verification

### 1. HTTPS
- [ ] Both frontend and backend use HTTPS
- [ ] SSL certificates valid
- [ ] No mixed content warnings

### 2. CORS
- [ ] CORS configured correctly
- [ ] Frontend can access backend
- [ ] No unauthorized access possible

### 3. Environment Variables
- [ ] No secrets exposed in client-side code
- [ ] All sensitive data in environment variables
- [ ] Database credentials secure

## Rollback Plan

### If Deployment Fails
- [ ] Check build logs in Render.com dashboard
- [ ] Verify environment variables
- [ ] Test database connection
- [ ] Check for missing dependencies
- [ ] Rollback to previous working commit if needed

### Common Issues
- [ ] Build failures: Check package.json scripts
- [ ] Database connection: Verify connection string format
- [ ] CORS errors: Check FRONTEND_URL setting
- [ ] 500 errors: Check application logs

## Success Criteria

### MVP Ready When:
- [ ] Users can register and login
- [ ] Users can create and view posts
- [ ] All premium features work (payments disabled)
- [ ] No critical errors in logs
- [ ] Performance is acceptable
- [ ] Security basics in place

## Next Steps After Successful Deployment

1. **User Testing**: Share with beta users
2. **Performance Monitoring**: Set up alerts
3. **Payment Integration**: When ready for monetization
4. **Custom Domain**: Configure custom domain
5. **Staging Environment**: Set up for future updates

## Emergency Contacts

- Render.com Support: https://render.com/support
- GitHub Repository: [Your repo URL]
- Database Provider: Azure Support

---

**Note**: Keep this checklist updated as you deploy and encounter issues. Document any additional steps or gotchas for future deployments.