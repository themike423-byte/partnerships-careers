# Password Reset Script

This script allows you to reset the admin password for the Firebase authentication system.

## Prerequisites

1. Node.js installed on your system
2. Firebase Admin SDK service account JSON file (should be in Downloads folder)
3. Firebase Admin SDK package installed

## Installation

```bash
npm install firebase-admin
```

## Usage

To reset the password for `themike423@gmail.com` to `@Password1`:

```bash
node scripts/reset-admin-password.js
```

## What it does

1. Connects to Firebase using the Admin SDK
2. Finds the user by email address
3. Updates their password to the new value
4. Confirms the password has been reset

## Security Note

⚠️ **Important**: After running this script, make sure to:
- Log in with the new password
- Change the password to something more secure
- Keep the service account JSON file secure and never commit it to version control

## Alternative: Using Firebase Console

You can also reset the password manually through the Firebase Console:

1. Go to https://console.firebase.google.com/
2. Select your project: `partnerships-careers`
3. Navigate to Authentication > Users
4. Find the user with email `themike423@gmail.com`
5. Click the three dots menu > Reset Password
6. A password reset email will be sent to the user

