# Login Troubleshooting Guide

## Error: "auth/invalid-credential"

This error means either:
1. **The email/password is incorrect** - Double-check your typing
2. **The account doesn't exist** - You need to sign up first

## How to Fix

### Option 1: Sign Up First (If You Don't Have an Account)

1. On the login page, click **"Don't have an account? Sign up"** at the bottom
2. Fill out the sign-up form:
   - **First Name**: Your first name
   - **Email Address**: themike423@gmail.com (or your email)
   - **Company Name**: Your company name
   - **Password**: Create a password (at least 8 characters)
   - **Confirm Password**: Type the same password again
3. Click **"Sign Up"**
4. You'll be automatically logged in!

### Option 2: Reset Your Password (If You Forgot It)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: "partnerships-careers"
3. Go to **Authentication** → **Users** tab
4. Find your email (themike423@gmail.com)
5. Click the three dots (⋮) next to it
6. Click **"Reset password"**
7. Check your email for the reset link

### Option 3: Check Firebase Authentication is Enabled

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Authentication** in the left sidebar
4. Click **"Sign-in method"** tab
5. Make sure **"Email/Password"** is enabled (should show "Enabled")
6. If not, click on it and toggle **"Enable"** to ON
7. Click **"Save"**

## Common Issues

**"No account found"**
- You need to sign up first - the account doesn't exist yet

**"Wrong password"**
- Double-check your password
- Make sure Caps Lock is off
- Try resetting your password (see Option 2 above)

**"Invalid email"**
- Make sure your email is formatted correctly (e.g., name@example.com)
- Check for typos

## Quick Test

1. Try signing up with a new account first
2. If sign-up works, then try logging in
3. If sign-up doesn't work, check Firebase Authentication settings

## Still Having Issues?

1. Check the browser console (Press F12 → Console tab) for more detailed errors
2. Make sure Firebase is properly configured in `src/firebase.js`
3. Verify your Firebase project has Authentication enabled

---

**Most likely solution**: Click "Don't have an account? Sign up" and create a new account!

