# 🚀 Azure App Service Deployment Guide

## 📁 **Files Created:**
- ✅ `backend/web.config` - IIS configuration for Node.js
- ✅ `backend/.deployment` - Azure deployment configuration
- ✅ `backend/deploy.cmd` - Custom deployment script
- ✅ `backend/ecosystem.config.js` - PM2 configuration
- ✅ `.github/workflows/azure-deploy.yml` - GitHub Actions deployment
- ✅ Updated `backend/package.json` with deployment scripts

## 🛡️ **Cost Protection Setup:**

### Step 1: Create App Service with F1 Free Tier
```bash
# Create resource group (if not exists)
az group create --name worrybox-rg --location "East US"

# Create App Service Plan (F1 Free Tier)
az appservice plan create \
  --name worrybox-plan \
  --resource-group worrybox-rg \
  --sku F1 \
  --is-linux false

# Create Web App
az webapp create \
  --name worrybox-backend \
  --resource-group worrybox-rg \
  --plan worrybox-plan \
  --runtime "NODE|18-lts"
```

### Step 2: Set Up Budget Alert with Auto-Shutdown
```bash
# Create budget with $0 threshold
az consumption budget create \
  --resource-group worrybox-rg \
  --budget-name "worrybox-zero-cost" \
  --amount 0 \
  --time-grain Monthly \
  --start-date 2025-01-01 \
  --end-date 2026-01-01
```

### Step 3: Configure Environment Variables
In Azure Portal → App Service → Configuration → Application Settings:

```
NODE_ENV=production
DATABASE_URL=your_azure_sql_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
OPENAI_API_KEY=your_openai_key
LEMONSQUEEZY_API_KEY=your_lemonsqueezy_key
LEMONSQUEEZY_STORE_ID=your_store_id
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
EMAIL_HOST=your_email_host
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

## 🔧 **GitHub Actions Setup:**

### Step 1: Get Publish Profile
1. Go to Azure Portal → Your App Service
2. Click "Get publish profile" 
3. Download the `.publishsettings` file
4. Copy the entire XML content

### Step 2: Add GitHub Secrets
Go to GitHub → Settings → Secrets and variables → Actions:

```
AZURE_WEBAPP_PUBLISH_PROFILE=<paste_publish_profile_xml>
DATABASE_URL=<your_azure_sql_connection>
DATABASE_URL_TEST=<test_database_connection>
JWT_SECRET=<your_jwt_secret>
JWT_REFRESH_SECRET=<your_refresh_secret>
```

### Step 3: Update App Name
In `.github/workflows/azure-deploy.yml`, change:
```yaml
AZURE_WEBAPP_NAME: worrybox-backend  # Change to your actual app name
```

## 🛡️ **F1 Free Tier Limits (Hard Limits - No Overage):**
- **CPU**: 60 minutes/day
- **Memory**: 1GB
- **Storage**: 1GB
- **Bandwidth**: 165MB/day
- **Custom Domains**: 1 free
- **SSL**: Free managed certificates

## 📊 **Monitoring & Alerts:**

### Set Up Application Insights (Free Tier)
```bash
az monitor app-insights component create \
  --app worrybox-insights \
  --location "East US" \
  --resource-group worrybox-rg \
  --application-type web
```

### Cost Monitoring Dashboard
1. Azure Portal → Cost Management + Billing
2. Create budget: $0 monthly limit
3. Set alerts at 80%, 90%, 100%
4. Configure action group to stop resources

## 🚀 **Deployment Process:**

### Automatic Deployment (Recommended)
1. Push to `main` branch
2. GitHub Actions automatically deploys
3. Health check verifies deployment

### Manual Deployment
```bash
# From backend directory
az webapp deployment source config-zip \
  --resource-group worrybox-rg \
  --name worrybox-backend \
  --src backend.zip
```

## 🔍 **Testing Deployment:**

### Health Check Endpoints
- `https://your-app.azurewebsites.net/api/health` - Detailed health
- `https://your-app.azurewebsites.net/health` - Simple health

### Logs and Debugging
```bash
# Stream logs
az webapp log tail --name worrybox-backend --resource-group worrybox-rg

# Download logs
az webapp log download --name worrybox-backend --resource-group worrybox-rg
```

## ⚠️ **Important Notes:**

1. **F1 Tier Limitations:**
   - App sleeps after 20 minutes of inactivity
   - 60 CPU minutes/day limit
   - No auto-scaling
   - No deployment slots

2. **Cost Protection:**
   - F1 tier has hard limits - no overage charges
   - Budget alerts provide early warning
   - Can set up auto-shutdown if needed

3. **Database Connection:**
   - Use connection pooling (already configured in your app)
   - Azure SQL and App Service in same region for best performance

## 🎯 **Next Steps:**
1. Create Azure App Service with F1 tier
2. Set up budget alerts
3. Configure environment variables
4. Set up GitHub Actions secrets
5. Deploy and test!

Your backend will be hosted for FREE with automatic cost protection! 🛡️