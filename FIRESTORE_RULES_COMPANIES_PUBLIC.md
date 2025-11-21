# Firestore Security Rules - Updated for Public Companies Page

## Issue
The companies page needs public read access to the `companies` collection, but current rules require authentication.

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
    
    // Jobs - PUBLIC READ (for job board)
    match /jobs/{jobId} {
      allow read: if true; // Public read for job board
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if false; // Use status: 'deleted' instead
    }
    
    // Companies - PUBLIC READ (for companies page), authenticated write
    match /companies/{companyId} {
      allow read: if true; // Public read for companies page
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        (resource.data.adminUserId == getUserUid() ||
         resource.data.createdBy == getUserUid());
    }
    
    // Company Members - authenticated only
    match /companyMembers/{memberId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        (resource.data.userId == getUserUid() ||
         resource.data.email == getUserEmail());
      allow delete: if false;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && userId == getUserUid();
      allow create: if isAuthenticated() && userId == getUserUid();
      allow update: if isAuthenticated() && userId == getUserUid();
    }
    
    // Access Requests - authenticated only
    match /accessRequests/{requestId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
    }
    
    // Default: deny all other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Key Changes

1. **Companies collection**: Changed from `allow read: if isAuthenticated()` to `allow read: if true` - allows public access
2. **Jobs collection**: Already public (for job board)
3. **Company Members**: Still requires authentication (private data)
4. **Users**: Still requires authentication (private data)

## How to Update

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `partnerships-careers`
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy and paste the rules above
5. Click **Publish**

## Testing

After updating:
1. Refresh your browser
2. Click the "Companies" button on the job board
3. Companies should load without permission errors
4. Logos should display correctly

## Security Note

- Companies data is now publicly readable (name, logo, website) - this is intentional for the public companies page
- Company members, users, and access requests remain private (require authentication)
- Only authenticated users can create/update companies

