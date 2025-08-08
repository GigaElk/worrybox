# Authentication Debugging Guide

## Quick Logout Issue - Troubleshooting Steps

### 1. Backend Configuration ✅ FIXED
- **JWT Access Token**: Now expires in 30 days (was 7 days)
- **JWT Refresh Token**: Now expires in 90 days (was 30 days)
- **Environment Variables Added**:
  ```env
  JWT_EXPIRES_IN=30d
  JWT_REFRESH_EXPIRES_IN=90d
  ```

### 2. Debug Endpoint Added
**New endpoint**: `GET /api/auth/check-token`

Test your current token:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:5000/api/auth/check-token
```

This will show:
- Token validity
- User info
- Expiration time
- Time until expiry

### 3. Common Frontend Issues to Check

#### A. Token Storage
Check if tokens are being stored properly:
```javascript
// In browser console
console.log('Access Token:', localStorage.getItem('token'));
console.log('Refresh Token:', localStorage.getItem('refreshToken'));
```

#### B. Token Refresh Logic
Make sure your frontend is calling the refresh endpoint:
```javascript
// Should call: POST /api/auth/refresh
// With body: { refreshToken: "your_refresh_token" }
```

#### C. Automatic Logout Triggers
Check for these common causes:
- Browser tab switching
- Network disconnection
- CORS issues
- Frontend error handling that clears tokens

### 4. Frontend Debugging Steps

#### Step 1: Check Token Persistence
```javascript
// Add this to your login success handler
console.log('Token stored:', localStorage.getItem('token'));
console.log('Refresh token stored:', localStorage.getItem('refreshToken'));

// Check if tokens persist after page reload
window.addEventListener('beforeunload', () => {
  console.log('Before unload - Token exists:', !!localStorage.getItem('token'));
});
```

#### Step 2: Monitor Token Expiry
```javascript
// Add this to check token expiry
function checkTokenExpiry() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const timeLeft = expiryTime - Date.now();
      console.log('Token expires in:', Math.floor(timeLeft / 1000 / 60), 'minutes');
      
      if (timeLeft < 0) {
        console.log('Token has expired!');
      }
    } catch (e) {
      console.error('Error parsing token:', e);
    }
  }
}

// Run every minute
setInterval(checkTokenExpiry, 60000);
```

#### Step 3: Check API Calls
Monitor network requests:
1. Open browser DevTools → Network tab
2. Look for 401/403 responses
3. Check if refresh token calls are being made
4. Verify Authorization headers are being sent

### 5. Common Solutions

#### A. If tokens are being cleared unexpectedly:
```javascript
// Use sessionStorage instead of localStorage for testing
sessionStorage.setItem('token', token);
sessionStorage.setItem('refreshToken', refreshToken);
```

#### B. If refresh isn't working:
```javascript
// Implement proper refresh logic
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return data.data.token;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
  
  return null;
}
```

#### C. If CORS is causing issues:
Check that your frontend is sending requests to the correct backend URL and that CORS is properly configured.

### 6. Testing Commands

#### Test token validity:
```bash
# Replace YOUR_TOKEN with actual token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/auth/check-token
```

#### Test refresh token:
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

#### Test protected endpoint:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/auth/profile
```

### 7. Expected Behavior

With the new configuration:
- **Access tokens** should last 30 days
- **Refresh tokens** should last 90 days
- Users should stay logged in for a month without needing to refresh
- Refresh should extend the session for another 30 days

### 8. Next Steps

1. **Test the new token expiration** by logging in and checking the debug endpoint
2. **Monitor frontend console** for any token-related errors
3. **Check network requests** to see if tokens are being sent properly
4. **Verify token storage** persists across browser sessions

If users are still getting logged out quickly, the issue is likely in the frontend token management rather than the backend configuration.