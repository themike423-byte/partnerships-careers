# Auth0 Authentication Troubleshooting

## Issue: Page Refreshes But Doesn't Authenticate

If clicking login buttons just refreshes the page without authenticating, check these settings:

## 1. Check Auth0 Application Settings

Go to: https://manage.auth0.com/ → **Applications** → **Your Application** → **Settings**

### Required Settings:

1. **Application Type:**
   - Must be: **Single Page Application**

2. **Allowed Callback URLs:**
   - Add: `http://localhost:3000, http://localhost:3001, http://localhost:5173`
   - Also add your production URL if deployed
   - Format: `http://localhost:3000, http://localhost:3001`

3. **Allowed Logout URLs:**
   - Add: `http://localhost:3000, http://localhost:3001, http://localhost:5173`

4. **Allowed Web Origins:**
   - Add: `http://localhost:3000, http://localhost:3001, http://localhost:5173`

5. **Click "Save Changes"** after updating

## 2. Check Auth0 Connections

Go to: **Authentication** → **Database** or **Social**

### Required Connections:

1. **Username-Password-Authentication** (Database)
   - Must be enabled
   - Go to: **Authentication** → **Database** → **Username-Password-Authentication**
   - Ensure it's enabled for your application

2. **Google OAuth** (Social)
   - Go to: **Authentication** → **Social** → **Google**
   - Must be enabled and configured
   - Must be enabled for your application

3. **Microsoft** (Social)
   - Go to: **Authentication** → **Social** → **Microsoft Account** (or **Azure AD**)
   - Must be enabled and configured
   - Must be enabled for your application

## 3. Check Browser Console

Open browser DevTools (F12) → Console tab

Look for:
- `🔧 Auth0 Config:` - Should show your Client ID (not MISSING)
- `🔐 Initiating login` - Should appear when clicking login
- `✅ Login redirect initiated` - Should appear after clicking
- Any error messages in red

## 4. Verify .env File

Check that `.env` file contains:
```
VITE_AUTH0_CLIENT_ID=i6XobV5ExbkGm8BzuJ9dIUCsMpXszBkP
```

**Important:** After changing `.env`, you MUST restart the dev server:
1. Stop server (Ctrl+C)
2. Run `npm run dev` again

## 5. Test the Redirect

When you click login, you should:
1. See console logs (`🔐 Initiating login`)
2. Be redirected to Auth0 login page (not just refresh)
3. After login, be redirected back to your app
4. See `✅ Auth0 user authenticated` in console

## 6. Common Issues

### Issue: "Invalid redirect_uri"
- **Fix:** Add your exact URL to "Allowed Callback URLs" in Auth0

### Issue: Connection not found
- **Fix:** Check connection names match exactly:
  - `Username-Password-Authentication` (not `username-password`)
  - `google-oauth2` (not `google`)
  - `windowslive` or `azuread` (check which one you have)

### Issue: Page just refreshes
- **Fix:** Check browser console for errors
- Verify Client ID is set correctly
- Ensure Application Type is "Single Page Application"

## 7. Still Not Working?

1. Clear browser cache and localStorage
2. Check Auth0 Dashboard → Monitoring → Logs for errors
3. Verify your Auth0 domain matches: `dev-xsw8nz51gqudjoik.us.auth0.com`
4. Make sure you're using the correct Client ID

