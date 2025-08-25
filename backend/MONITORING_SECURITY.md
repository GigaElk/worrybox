# Monitoring & Logging Security Guide

## 🔒 Access Control Overview

The monitoring and logging features have been secured with multiple authentication methods to protect sensitive system information.

## 🎯 Access Levels

### **Public Access** (No Authentication Required)
- `/api/monitoring/health` - Basic health status only
- `/health` - Simple health check for load balancers

### **Monitoring Access** (API Key or Admin Role Required)
- `/api/monitoring/metrics` - System metrics and performance data
- `/api/monitoring/performance` - Performance analytics
- `/api/monitoring/alerts` - System alerts and notifications
- `/api/monitoring/memory` - Memory usage statistics
- `/api/monitoring/schedulers` - Scheduler status
- `/api/monitoring/errors` - Error metrics (summary only)
- `/api/monitoring/platform` - Platform information
- `/api/monitoring/status` - Overall system status
- `/api/monitoring/startup` - Startup optimization metrics
- `/api/monitoring/lazy` - Lazy service status
- `/api/monitoring/logs` - Logging metrics overview
- `/api/monitoring/logs/performance` - Performance logging data
- `/api/monitoring/logs/errors` - Error logging data
- `/api/monitoring/logs/config` - Current logging configuration (read-only)

### **Admin Access** (Admin Role or Admin API Key Required)
- `/api/monitoring/diagnostics` - Detailed system diagnostics
- `/api/monitoring/gc` - Manual garbage collection trigger
- `/api/monitoring/alerts/:id/acknowledge` - Alert management
- `/api/monitoring/startup/validate` - Manual health validation
- `/api/monitoring/lazy/:serviceName/load` - Load specific services
- `/api/monitoring/logs/level` - Change log levels
- `/api/monitoring/logs/debug` - Enable debug mode
- `/api/monitoring/logs/config` - Update logging configuration

## 🔑 Authentication Methods

### 1. API Key Authentication
Add one of these headers to your requests:
```bash
# Method 1: X-API-Key header
curl -H "X-API-Key: your-monitoring-api-key" \
     https://your-app.com/api/monitoring/metrics

# Method 2: Authorization Bearer token
curl -H "Authorization: Bearer your-monitoring-api-key" \
     https://your-app.com/api/monitoring/metrics

# Method 3: Query parameter (not recommended for production)
curl "https://your-app.com/api/monitoring/metrics?apiKey=your-monitoring-api-key"
```

### 2. User Role Authentication
If you're logged in with an admin role, you can access monitoring endpoints directly:
```bash
# First authenticate to get session/token
curl -X POST https://your-app.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password"}'

# Then use the session to access monitoring
curl -H "Authorization: Bearer your-jwt-token" \
     https://your-app.com/api/monitoring/metrics
```

### 3. IP Whitelist (Optional)
Configure allowed IP addresses for monitoring access (read-only operations only).

## ⚙️ Configuration

### Environment Variables
Set these environment variables to configure authentication:

```bash
# Required: Set strong API keys
MONITORING_API_KEY=your-secure-monitoring-key-here
ADMIN_API_KEY=your-secure-admin-key-here

# Optional: IP whitelist (comma-separated)
MONITORING_ALLOWED_IPS=192.168.1.100,10.0.0.50

# Optional: Bypass auth in development (default: true)
NODE_ENV=development  # Bypasses monitoring auth (NOT admin auth)
```

### Admin Roles
Users with these roles can access monitoring endpoints:
- `admin`
- `super_admin` 
- `system_admin`

## 🚨 Security Recommendations

### Production Setup
1. **Set Strong API Keys**: Use long, random strings for API keys
2. **Rotate Keys Regularly**: Change API keys periodically
3. **Use HTTPS Only**: Never send API keys over HTTP
4. **Limit IP Access**: Use IP whitelist for additional security
5. **Monitor Access**: Review monitoring access logs regularly

### Development Setup
- Monitoring auth is bypassed in development by default
- Admin operations still require authentication even in development
- Use different API keys for development and production

## 📊 Access Logging

All monitoring access attempts are logged with:
- IP address and user agent
- Authentication method used
- Endpoint accessed
- Success/failure status
- User ID (if authenticated via user role)

Example log entry:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Authorized monitoring access",
  "operation": "monitoring_read",
  "path": "/api/monitoring/metrics",
  "method": "GET",
  "ip": "192.168.1.100",
  "user": "admin-user-123",
  "category": "monitoring_access"
}
```

## 🔧 API Key Management

### Generating Secure API Keys
```bash
# Generate a secure random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use openssl
openssl rand -hex 32
```

### Key Rotation Process
1. Generate new API key
2. Update environment variable
3. Restart application
4. Update monitoring tools with new key
5. Verify access works with new key
6. Remove old key from any documentation

## 🚫 What's Protected

The monitoring system protects access to:
- **System Metrics**: Memory, CPU, database statistics
- **Performance Data**: Response times, slow operations, bottlenecks
- **Error Information**: Error patterns, recent errors, error rates
- **Configuration**: Log levels, feature toggles, system settings
- **Diagnostic Data**: Environment variables, system state, troubleshooting info
- **Control Operations**: Garbage collection, service loading, debug mode

## ⚠️ Security Warnings

1. **Never commit API keys to version control**
2. **Don't log API keys in application logs**
3. **Use environment variables for all secrets**
4. **Regularly audit who has access to monitoring**
5. **Monitor for unusual access patterns**
6. **Consider rate limiting for monitoring endpoints**

## 🔍 Troubleshooting Access Issues

### Common Issues

**401 Unauthorized**
- Check if API key is set correctly
- Verify the API key matches the configured value
- Ensure you're using the correct header format

**403 Forbidden**
- Admin access required - check user role
- Verify user has admin privileges
- Check if admin API key is being used

**Bypassed in Development**
- Monitoring access is bypassed in development mode
- Admin operations still require authentication
- Set `NODE_ENV=production` to enforce all authentication

### Testing Access
```bash
# Test monitoring access
curl -H "X-API-Key: $MONITORING_API_KEY" \
     https://your-app.com/api/monitoring/health

# Test admin access
curl -H "X-API-Key: $ADMIN_API_KEY" \
     -X POST https://your-app.com/api/monitoring/logs/debug \
     -H "Content-Type: application/json" \
     -d '{"duration": 60000}'
```

## 📞 Support

If you need help with monitoring access:
1. Check the application logs for authentication errors
2. Verify your API keys are set correctly
3. Ensure you're using the correct authentication method
4. Review this documentation for proper endpoint access levels