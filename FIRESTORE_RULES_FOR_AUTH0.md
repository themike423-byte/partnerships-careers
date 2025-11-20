# Firestore Security Rules for Auth0

## The Problem
Your current rules use `request.auth.uid`, but Auth0 user IDs are in format `auth0|xxxxx`, not Firebase Auth UIDs. Firestore security rules work with Firebase Auth by default, not Auth0 directly.

## Solution 1: Development Rules (Use This Now)

Copy and paste this into Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**This allows any authenticated user to read/write everything.** Use only for development/testing.

## Solution 2: Proper Auth0 Integration (For Production)

To properly secure Firestore with Auth0, you need to:

1. **Set up Firebase Custom Claims from Auth0** - This requires a backend function that:
   - Receives Auth0 tokens
   - Verifies them
   - Sets custom claims in Firebase Auth
   - Then Firestore rules can check those claims

OR

2. **Use Firebase Admin SDK on Backend** - All Firestore operations go through your backend API, which verifies Auth0 tokens and uses Admin SDK (bypasses security rules)

## For Now: Use Solution 1

The development rules above will fix your "Missing or insufficient permissions" errors immediately. You can secure it properly later when you set up the Auth0 → Firebase Auth integration.

## How to Apply

1. Go to https://console.firebase.google.com/
2. Select your project: `partnerships-careers`
3. Go to **Firestore Database** → **Rules** tab
4. Delete everything in the editor
5. Paste the rules from Solution 1 above
6. Click **Publish**

This will immediately fix your permission errors!

