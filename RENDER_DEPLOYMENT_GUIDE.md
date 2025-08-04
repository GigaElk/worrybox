# Render.com Deployment Guide for Worrybox

This guide walks you through deploying the Worrybox application to Render.com.

## Prerequisites

1. **Render.com Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **Azure SQL Database**: Your existing Azure SQL database should be accessible

## Backend Deployment

### Step 1: Create Web Service

1. Go to your Render.com dashboard
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `worrybox-backend`
   - **Region**: Oregon (or closest to your users)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm ci && npm run build && npx prisma generate`
   - **Start Command**: `npm start`

### Step 2: Environment Variables

Add these environment variables in Render.com dashboard:

#### Required Variables
```
NODE_ENV=production
PORT=10000
DATABASE_URL=your-azure-sql-connection-string
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
FRONTEND_URL=https://your-frontend-url.onrender.com
DISABLE_PAYMENTS=true
```

#### Optional Variables (for full functionality)
```
OPENAI_API_KEY=your-openai-api-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Step 3: Database Connection

Your Azure SQL Database connection string should be in this format:
```
sqlserver://worrybox.database.windows.net;port=1433;database=worryboxdb;user=wbprojcon;password=YOUR_PASSWORD;encrypt=true;trustServerCertificate=false
```

## Frontend Deployment

### Step 1: Create Static Site

1. In Render.com dashboard, click "New" → "Static Site"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `worrybox-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `build`

### Step 2: Environment Variables

Add these environment variables:
```
REACT_APP_API_URL=https://your-backend-url.onrender.com
REACT_APP_ENVIRONMENT=production
```

## Deployment Process

### Automatic Deployment

1. Push your code to GitHub
2. Render.com will automatically detect changes and deploy
3. Monitor the deployment logs in the Render.com dashboard

### Manual Deployment

1. Go to your service in Render.com dashboard
2. Click "Manual Deploy" → "Deploy latest commit"

## Health Checks

Your backend includes health check endpoints:
- `/api/health` - Detailed health status
- `/health` - Simple OK/UNHEALTHY response

Render.com will automatically use these for monitoring.

## Database Migrations

Database migrations run automatically during deployment via:
```bash
npx prisma db push --accept-data-loss
```

## Monitoring

### Logs
- View real-time logs in Render.com dashboard
- Logs are automatically retained for 7 days

### Metrics
- CPU and memory usage available in dashboard
- Response time and error rate monitoring

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all dependencies are in package.json
   - Verify build command is correct
   - Check environment variables are set

2. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check Azure SQL firewall allows Render.com IPs
   - Test connection string locally first

3. **CORS Issues**
   - Ensure FRONTEND_URL matches your frontend domain
   - Check that both HTTP and HTTPS are handled

### Debug Steps

1. Check deployment logs in Render.com dashboard
2. Use health check endpoints to verify service status
3. Check environment variables are properly set
4. Verify database connectivity

## Cost Optimization

### Free Tier Limits
- Web services: 750 hours/month
- Static sites: Unlimited
- Bandwidth: 100GB/month

### Scaling
- Render.com auto-scales based on traffic
- Monitor usage in dashboard
- Upgrade plan as needed

## Security Considerations

1. **Environment Variables**: Never commit secrets to Git
2. **HTTPS**: Render.com provides free SSL certificates
3. **Database**: Ensure Azure SQL has proper firewall rules
4. **Rate Limiting**: Already configured in the application

## Next Steps

After successful deployment:

1. Test all functionality
2. Set up monitoring alerts
3. Configure custom domain (optional)
4. Set up staging environment
5. Enable payment processing when ready

## Support

- Render.com Documentation: https://render.com/docs
- Render.com Community: https://community.render.com
- GitHub Issues: Create issues in your repository