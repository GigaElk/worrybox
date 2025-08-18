# Migration from Azure SQL Server to Render PostgreSQL

## 🚀 Quick Migration Steps

### 1. Create Render PostgreSQL Database

1. Go to your [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "PostgreSQL"
3. Choose:
   - **Name**: `worrybox-db` (or whatever you prefer)
   - **Database**: `worrybox`
   - **User**: `worrybox_user` (auto-generated)
   - **Region**: Same as your backend service
   - **PostgreSQL Version**: 15 (latest)
   - **Plan**: Free
4. Click "Create Database"
5. **Copy the External Database URL** (starts with `postgresql://`)

### 2. Update Environment Variables

In your Render backend service:
1. Go to Environment tab
2. Update `DATABASE_URL` with your new PostgreSQL URL
3. **Don't deploy yet!** We need to migrate data first.

### 3. Export Data from SQL Server (Run Locally)

```bash
# Make sure you're still connected to SQL Server
cd backend
node scripts/exportDataFromSqlServer.js
```

This creates: `backend/scripts/export/worrybox_export_YYYY-MM-DD.json`

### 4. Update Local Environment for PostgreSQL

Create a `.env.local` file with your new PostgreSQL URL:
```
DATABASE_URL="your-render-postgresql-url-here"
```

### 5. Generate and Push New Schema

```bash
# Generate Prisma client for PostgreSQL
npx prisma generate

# Push schema to new PostgreSQL database
npx prisma db push
```

### 6. Import Data to PostgreSQL

```bash
# Import your exported data
node scripts/importDataToPostgreSQL.js scripts/export/worrybox_export_YYYY-MM-DD.json
```

### 7. Test Locally

```bash
# Test with PostgreSQL locally
npm run dev
```

Verify:
- ✅ App starts without errors
- ✅ You can log in
- ✅ Your posts/data are visible
- ✅ All features work

### 8. Deploy to Production

1. Update your Render service environment with the PostgreSQL `DATABASE_URL`
2. Deploy your updated code
3. Your app should now be running on PostgreSQL! 🎉

## 🔧 Troubleshooting

### If Export Fails
- Check your current SQL Server connection
- Some tables might be empty (that's okay)

### If Import Fails
- Check PostgreSQL connection string
- Some records might fail (script will continue)
- Check logs for specific errors

### If App Doesn't Start
- Verify `DATABASE_URL` is correct
- Run `npx prisma generate` again
- Check Render logs for specific errors

## 📊 What Changed

- **Database**: SQL Server → PostgreSQL
- **Field Types**: Removed `@db.NVarChar(Max)` and `@db.Decimal(5,2)`
- **Performance**: Should be much better on PostgreSQL
- **Limits**: Much more generous free tier limits

## 🎯 Benefits

- ✅ **Better Performance**: PostgreSQL is faster for your use case
- ✅ **More Generous Limits**: 1GB storage, 100GB bandwidth
- ✅ **Same Platform**: Database and backend on Render
- ✅ **Better Scaling**: Easier to upgrade when needed
- ✅ **Lower Latency**: Internal networking between services

## 📞 Need Help?

If you run into issues:
1. Check the export/import logs
2. Verify your DATABASE_URL format
3. Test locally before deploying
4. Check Render service logs

The migration should be smooth since you originally came from PostgreSQL! 🚀