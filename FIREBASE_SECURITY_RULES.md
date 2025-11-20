# Firebase Firestore Security Rules

## Current Issue
Your Firestore security rules are blocking reads, causing "Missing or insufficient permissions" errors.

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
    
    // Helper function to get user's company ID
    function getUserCompanyId() {
      return get(/databases/$(database)/documents/companyMembers/$(request.auth.uid.split('|').join('_'))).data.companyId;
    }
    
    // Company Members - users can read/write their own record
    match /companyMembers/{memberId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        (request.resource.data.userId == request.auth.uid || 
         resource.data.userId == request.auth.uid);
      allow delete: if false; // No deletes
    }
    
    // Companies - users can read companies they belong to
    match /companies/{companyId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        (resource.data.createdBy == request.auth.uid ||
         resource.data.adminUserId == request.auth.uid);
    }
    
    // Jobs - users can read all active jobs, write jobs for their company
    match /jobs/{jobId} {
      allow read: if isAuthenticated() || resource.data.status == 'active';
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if false; // Use status: 'deleted' instead
    }
  }
}
```

## Simpler Rules (For Development/Testing)

If the above doesn't work, use these simpler rules for testing:

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

**⚠️ WARNING:** The simpler rules allow any authenticated user to read/write everything. Only use for development/testing!

## How to Apply

1. Go to https://console.firebase.google.com/
2. Select your project
3. Go to Firestore Database → Rules
4. Paste the rules above
5. Click "Publish"

