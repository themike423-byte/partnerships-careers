# Fix Auth0 Organization Selection Screen

## Problem
Auth0 is showing an "Enter Your Organization" screen instead of going directly to login. This happens when Organizations are enabled in your Auth0 tenant.

## Solution: Disable Organizations in Auth0

1. **Go to Auth0 Dashboard:**
   - Navigate to: https://manage.auth0.com/
   - Log in to your account

2. **Disable Organizations:**
   - Go to **Settings** → **General**
   - Scroll down to **Organizations**
   - Toggle **"Enable Organizations"** to **OFF**
   - Click **Save Changes**

3. **Alternative: If you need Organizations:**
   - Go to **Organizations** in the left sidebar
   - Create a default organization
   - In your application settings, set this as the default organization
   - Or specify the organization ID in the login redirect

## Quick Fix in Code (if you can't disable organizations)

If you must keep organizations enabled, you can specify a default organization in the login flow. However, the best solution is to disable organizations if you don't need them.

## After Making Changes

1. Restart your dev server
2. Clear browser cache
3. Try logging in again

The organization selection screen should no longer appear, and users will go directly to the login/signup page.

