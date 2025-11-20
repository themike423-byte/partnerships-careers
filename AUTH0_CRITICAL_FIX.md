# CRITICAL: Auth0 Callback URL Configuration

## The Problem
When you click login buttons, the page refreshes but doesn't redirect to Auth0. This is because the **Callback URLs don't match** what's configured in Auth0.

## IMMEDIATE FIX REQUIRED

### Step 1: Go to Auth0 Dashboard
1. Open: https://manage.auth0.com/
2. Navigate to: **Applications** → **Your Application** (the one with Client ID: `i6XobV5ExbkGm8BzuJ9dIUCsMpXszBkP`)

### Step 2: Update Callback URLs
In the **Settings** tab, find these fields and add **ALL** of these URLs (comma-separated):

**Allowed Callback URLs:**
```
http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:3000/,http://localhost:3001/,http://localhost:5173/
```

**Allowed Logout URLs:**
```
http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:3000/,http://localhost:3001/,http://localhost:5173/
```

**Allowed Web Origins:**
```
http://localhost:3000,http://localhost:3001,http://localhost:5173
```

### Step 3: Verify Application Type
Make sure **Application Type** is set to: **Single Page Application**

### Step 4: Save and Test
1. Click **Save Changes**
2. Go back to your app
3. **Hard refresh** the browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Try logging in again

## Why This Happens
Auth0 checks the `redirect_uri` parameter against the "Allowed Callback URLs" list. If it doesn't match exactly, Auth0 rejects the request and the page just refreshes without redirecting.

## Current Issue
Your app is running on `http://localhost:3001` but Auth0 might only have `http://localhost:3000` configured, causing the redirect to fail silently.

## After Fixing
You should see:
- Console log: `🔐 Initiating login` when you click login
- Redirect to Auth0 login page (not just a page refresh)
- After login, redirect back to your app
- Console log: `✅ Auth0 user authenticated`

