# Firestore Security Rules

## Problem
Users are getting "Missing or insufficient permissions" errors when trying to:
- Create new user accounts in `companyMembers` collection
- Create new companies in `companies` collection
- Update admin status in `companyMembers` collection
- Read company and member data

## Required Firestore Security Rules

You need to update your Firestore security rules in the Firebase Console to allow authenticated users to:

1. **Read their own company member record**
2. **Create their own company member record** (for new users)
3. **Update their own company member record** (for admin status updates)
4. **Read company data** for their company
5. **Create new companies** (for first-time users)
6. **Update company data** (for admins)

### Recommended Rules

Go to Firebase Console → Firestore Database → Rules and update with:

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
    
    // Helper function to check if user owns the member record
    function isMemberOwner(memberId) {
      return isAuthenticated() && 
             resource.data.email == getUserEmail();
    }
    
    // Companies collection
    match /companies/{companyId} {
      // Allow read if user is a member of this company
      allow read: if isAuthenticated() && 
        exists(/databases/$(database)/documents/companyMembers/$(companyId + '_' + request.auth.uid));
      
      // Allow create for authenticated users (new company creation)
      allow create: if isAuthenticated();
      
      // Allow update only for company admins
      allow update: if isAuthenticated() && 
        (get(/databases/$(database)/documents/companyMembers/$(companyId + '_' + request.auth.uid)).data.isAdmin == true ||
         resource.data.adminUserId == request.auth.uid ||
         resource.data.createdBy == request.auth.uid);
    }
    
    // Company Members collection
    match /companyMembers/{memberId} {
      // Allow read if user is authenticated and it's their own record or they're in the same company
      allow read: if isAuthenticated() && (
        resource.data.email == getUserEmail() ||
        resource.data.userId == request.auth.uid
      );
      
      // Allow create for authenticated users (new user signup)
      // User can only create their own member record
      allow create: if isAuthenticated() && 
        request.resource.data.email == getUserEmail() &&
        request.resource.data.userId == request.auth.uid;
      
      // Allow update if user is updating their own record or is an admin of the company
      allow update: if isAuthenticated() && (
        resource.data.email == getUserEmail() ||
        resource.data.userId == request.auth.uid ||
        (exists(/databases/$(database)/documents/companyMembers/$(resource.data.companyId + '_' + request.auth.uid)) &&
         get(/databases/$(database)/documents/companyMembers/$(resource.data.companyId + '_' + request.auth.uid)).data.isAdmin == true)
      );
    }
    
    // Jobs collection - PUBLIC READ for active jobs, authenticated write
    match /jobs/{jobId} {
      // Allow public read of active jobs (for public job board)
      allow read: if resource.data.status == 'active' || request.auth != null;
      // Only authenticated users can create/update/delete
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
    
    // Job summaries collection (if needed)
    match /jobSummaries/{summaryId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
    }
  }
}
```

### Alternative: More Permissive Rules (for development/testing)

If you're still in development and want to allow public job reads and authenticated writes:

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

⚠️ **WARNING**: The permissive rules above should ONLY be used during development. For production, use the more restrictive rules above.

## How to Update Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `partnerships-careers`
3. Navigate to **Firestore Database** → **Rules** tab
4. Paste the rules above
5. Click **Publish**

## Testing

After updating the rules, test by:
1. Signing in as `bob@consultant.com`
2. Check console for permission errors
3. Verify that:
   - User record is created in `companyMembers`
   - Admin status is set correctly (`isAdmin: true` for @consultant.com emails)
   - Company data can be read
   - Jobs can be fetched

## Current Issues

Based on the console errors:
- ❌ Users cannot create `companyMembers` records (permission denied)
- ❌ Users cannot read `companies` data (permission denied)
- ❌ Users cannot read `jobs` data (permission denied)

All of these should be fixed with the rules above.

