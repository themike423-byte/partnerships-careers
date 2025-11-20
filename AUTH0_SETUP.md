# Auth0 Setup Guide

## What Was Fixed

I've improved your Auth0 integration with the following changes:

1. **Enhanced Error Handling**: Added comprehensive error logging and user-friendly error messages
2. **Improved Redirect URI Handling**: Fixed the callback handling to properly process Auth0 redirects
3. **Better Configuration Logging**: Added detailed console logs to help debug authentication issues
4. **Enhanced Login Functions**: Improved all login methods (Email/Password, Google, Microsoft) with better error handling

## Critical: Auth0 Dashboard Configuration

For authentication to work, you **MUST** configure these settings in your Auth0 Dashboard:

### Step 1: Application Settings
1. Go to https://manage.auth0.com/
2. Navigate to **Applications** → Your Application
3. Click on **Settings**

### Step 2: Configure URLs
In the **Application URIs** section, add these URLs (replace with your actual URLs):

**Allowed Callback URLs:**
```
http://localhost:3000
http://localhost:5173
https://your-production-domain.com
```

**Allowed Logout URLs:**
```
http://localhost:3000
http://localhost:5173
https://your-production-domain.com
```

**Allowed Web Origins:**
```
http://localhost:3000
http://localhost:5173
https://your-production-domain.com
```

### Step 3: Application Type
- Make sure your application type is set to **Single Page Application**

### Step 4: Disable Organization Requirement ⚠️ CRITICAL
**This is the most common cause of login failures!**

1. In your Application Settings, scroll down to the **"Organization Usage"** section
2. Make sure **"Require Organization"** is set to **OFF** or **None**
3. If you see "parameter organization is required" error, this is the fix!

**Why?** Your Auth0 application is currently configured to require an organization parameter, but the code doesn't use organizations. For a simple login flow, you don't need organizations.

### Step 5: Enable Connections
Go to **Authentication** → **Database** and ensure:
- ✅ **Username-Password-Authentication** is enabled (for email/password login)

Go to **Authentication** → **Social** and ensure:
- ✅ **Google** connection is enabled and configured (for Google sign-in)
- ✅ **Microsoft** connection is enabled and configured (for Microsoft sign-in)

### Step 6: Verify Client ID
- Your Client ID should be in your `.env` file as `VITE_AUTH0_CLIENT_ID`
- The Client ID is visible in the Application Settings page

## Testing the Login

1. **Start your dev server**: `npm run dev`
2. **Open the browser console** to see detailed Auth0 logs
3. **Click "Employer Login"** button
4. **Try logging in** with:
   - Email/Password (if you have an account)
   - Google (if Google connection is enabled)
   - Microsoft (if Microsoft connection is enabled)

## Common Issues & Solutions

### Issue: "Redirect URI mismatch"
**Solution**: Make sure the exact URL (including port) is in your Auth0 Allowed Callback URLs. For example, if you're running on `http://localhost:3000`, that exact URL must be in the list.

### Issue: "Connection not found"
**Solution**: Enable the connection in Auth0 Dashboard → Authentication → Database/Social

### Issue: "Invalid client"
**Solution**: Verify your Client ID in `.env` file matches the one in Auth0 Dashboard

### Issue: "parameter organization is required for this client" ⚠️ MOST COMMON
**Solution**: 
1. Go to Auth0 Dashboard → Applications → Your App → Settings
2. Scroll to **"Organization Usage"** section
3. Set **"Require Organization"** to **OFF** or **None**
4. Save the changes
5. Try logging in again

This is the #1 cause of login failures - Auth0 is requiring an organization but the code doesn't use organizations.

### Issue: Login redirects but doesn't authenticate
**Solution**: 
1. Check browser console for errors
2. Verify Allowed Callback URLs includes your exact URL
3. Check that the application type is "Single Page Application"
4. Clear browser cache and localStorage

## Debugging

The application now includes extensive logging. Check your browser console for:
- 🔧 Auth0 configuration details
- 🔄 Authentication state changes
- ❌ Any errors that occur during login
- 📍 Current URLs and redirect information

## Next Steps

1. **Configure Auth0 Dashboard** with the URLs above
2. **Test the login flow** with each method (Email, Google, Microsoft)
3. **Check the browser console** for any errors or warnings
4. **Verify Firebase integration** works after successful authentication

If you continue to have issues, check the browser console logs - they now provide detailed information about what's happening during the authentication process.
