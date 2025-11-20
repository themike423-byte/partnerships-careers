# How to Migrate Your Jobs to Firestore

I've created a migration script that will import all your existing jobs from your Google Sheet into Firestore.

## Step 1: Get Your Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: "partnerships-careers"
3. Click the gear icon ⚙️ → "Project settings"
4. Click the "Service accounts" tab
5. Click "Generate new private key"
6. Click "Generate key" in the popup
7. A JSON file will download - **save it as `serviceAccountKey.json`**
8. **Move this file** to your project folder: `C:\Users\mikes\partnerships-careers\`

⚠️ **IMPORTANT**: Never commit this file to GitHub! It contains sensitive credentials.

## Step 2: Run the Migration Script

1. Open PowerShell in your project folder
2. Run this command:
   ```
   node migrate-jobs.js
   ```

3. You should see output like:
   ```
   🚀 Starting job migration to Firestore...
   ✅ Migrated: Director of Channel Partnerships at Reality Defender
   ✅ Migrated: Sr. Ecosystems Strategic Analytics Manager at PaloAlto Networks
   ...
   ✨ Migration complete!
      ✅ Successfully migrated: 11 jobs
      ❌ Errors: 0 jobs
   ```

## Step 3: Verify the Migration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click "Firestore Database" in the left sidebar
4. You should see a collection called `jobs`
5. Click on it - you should see all your jobs!

## Step 4: Test Your Website

1. Refresh your website in the browser
2. All your jobs should now appear! 🎉

## Troubleshooting

**Error: "Cannot find module 'firebase-admin'"**
- Run: `npm install`

**Error: "Cannot find module './serviceAccountKey.json'"**
- Make sure you downloaded the service account key
- Make sure it's named exactly `serviceAccountKey.json`
- Make sure it's in the project folder

**Error: "Permission denied"**
- Make sure your Firestore rules allow writes (see FIRESTORE_MIGRATION_COMPLETE.md)
- Or temporarily set rules to allow all writes for migration:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true;
      }
    }
  }
  ```
  (Remember to change this back after migration!)

**Jobs not showing on website**
- Check that jobs have `status: 'active'` in Firestore
- Check browser console for errors (F12)

## What the Script Does

The migration script:
1. Reads all your job data
2. Converts dates to the correct format
3. Converts `isFeatured` from TRUE/FALSE to boolean
4. Sets default values for missing fields
5. Uploads each job to Firestore

## After Migration

Once migration is complete:
1. ✅ Your jobs will be in Firestore
2. ✅ Your website will display them
3. ✅ You can delete the `serviceAccountKey.json` file (or keep it safe for future migrations)
4. ✅ You can stop using Sheety/Google Sheets for jobs

---

**Need help?** Check the error message and let me know what it says!

