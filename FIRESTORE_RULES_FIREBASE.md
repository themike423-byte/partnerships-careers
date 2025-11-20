# Firestore Security Rules for Firebase Auth

## Current Issue
The public job board is getting "Missing or insufficient permissions" errors because the Firestore rules don't allow public read access to the jobs collection.

## Solution: Update Firestore Rules

Go to Firebase Console → Firestore Database → Rules and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to get user's email
    function getUserEmail() {
      return request.auth.token.email;
    }
    
    // Helper function to get user's UID
    function getUserUid() {
      return request.auth.uid;
    }
    
    // Jobs collection - PUBLIC READ for active jobs, authenticated write
    match /jobs/{jobId} {
      // Allow public read of active jobs (for public job board)
      // Also allow authenticated users to read any job
      allow read: if resource.data.status == 'active' || isAuthenticated();
      
      // Only authenticated users can create/update/delete
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
    
    // Companies collection
    match /companies/{companyId} {
      // Allow read if user is authenticated and is a member of this company
      allow read: if isAuthenticated() && 
        exists(/databases/$(database)/documents/companyMembers/$(companyId + '_' + getUserUid()));
      
      // Allow create for authenticated users (new company creation)
      allow create: if isAuthenticated();
      
      // Allow update only for company admins
      allow update: if isAuthenticated() && 
        (get(/databases/$(database)/documents/companyMembers/$(companyId + '_' + getUserUid())).data.isAdmin == true ||
         resource.data.adminUserId == getUserUid() ||
         resource.data.createdBy == getUserUid());
    }
    
    // Company Members collection
    match /companyMembers/{memberId} {
      // Allow read if user is authenticated and it's their own record or they're in the same company
      allow read: if isAuthenticated() && (
        resource.data.email == getUserEmail() ||
        resource.data.userId == getUserUid()
      );
      
      // Allow create for authenticated users (new user signup)
      // User can only create their own member record
      allow create: if isAuthenticated() && 
        request.resource.data.email == getUserEmail() &&
        request.resource.data.userId == getUserUid();
      
      // Allow update if user is updating their own record or is an admin of the company
      allow update: if isAuthenticated() && (
        resource.data.email == getUserEmail() ||
        resource.data.userId == getUserUid() ||
        (exists(/databases/$(database)/documents/companyMembers/$(resource.data.companyId + '_' + getUserUid())) &&
         get(/databases/$(database)/documents/companyMembers/$(resource.data.companyId + '_' + getUserUid())).data.isAdmin == true)
      );
    }
    
    // Users collection (if you have one)
    match /users/{userId} {
      allow read: if isAuthenticated() && userId == getUserUid();
      allow create: if isAuthenticated() && userId == getUserUid();
      allow update: if isAuthenticated() && userId == getUserUid();
    }
    
    // Job summaries collection (if needed)
    match /jobSummaries/{summaryId} {
      allow read: if true; // Public read for job summaries
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
    }
  }
}
```

## Key Changes for Firebase Auth

1. **Public Job Reads**: `allow read: if resource.data.status == 'active' || isAuthenticated();`
   - This allows anyone (even unauthenticated users) to read active jobs
   - Authenticated users can read any job

2. **User ID Format**: Uses `request.auth.uid` (Firebase Auth UID) instead of Auth0's `sub` format

3. **Email Access**: Uses `request.auth.token.email` for email-based checks

## How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `partnerships-careers`
3. Navigate to **Firestore Database** → **Rules** tab
4. Delete the existing rules
5. Paste the rules above
6. Click **Publish**

## Testing

After updating the rules:
1. Refresh your public job board (without logging in)
2. Jobs should load without permission errors
3. Try logging in and creating a job
4. Verify authenticated users can read/write their company data

## Alternative: Development Rules (Temporary)

If you need to test quickly and don't mind less security:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Jobs - public read, authenticated write
    match /jobs/{jobId} {
      allow read: if true; // Public read for job board
      allow write: if request.auth != null;
    }
    
    // Everything else requires authentication
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

⚠️ **WARNING**: The alternative rules above allow public reads of everything. Use only for development/testing!

