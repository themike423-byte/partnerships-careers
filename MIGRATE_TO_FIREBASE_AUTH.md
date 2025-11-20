# Migrating from Auth0 to Firebase Auth

You're absolutely right - Auth0 is adding unnecessary complexity. Firebase Auth is simpler, more integrated, and will solve the email mismatch issues.

## Why Migrate?

1. **Simpler**: No email mismatches between Auth0 and Firebase
2. **Integrated**: Works seamlessly with Firestore security rules
3. **Free**: Firebase Auth free tier is generous
4. **Less Code**: Fewer dependencies and simpler authentication flow
5. **Better UX**: Direct Google sign-in without Auth0 redirects

## Migration Steps

### 1. Update Firestore Rules First

Before migrating, update your Firestore rules to allow public job reads (see `FIRESTORE_RULES.md`).

### 2. Replace Auth0 with Firebase Auth

#### Step 1: Remove Auth0 Dependencies

```bash
npm uninstall @auth0/auth0-react
```

#### Step 2: Update `main.jsx`

Remove Auth0Provider wrapper:

```jsx
// OLD (with Auth0)
import { Auth0Provider } from '@auth0/auth0-react'
// ... Auth0Provider wrapper

// NEW (Firebase Auth)
// No provider needed - Firebase Auth works globally
```

#### Step 3: Update `App.jsx`

Replace Auth0 hooks with Firebase Auth:

```jsx
// OLD
import { useAuth0 } from '@auth0/auth0-react';
const { user, isAuthenticated, loginWithRedirect, logout } = useAuth0();

// NEW
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';
import { googleProvider } from './firebase';

// In component:
const [user, setUser] = useState(null);
const [isAuthenticated, setIsAuthenticated] = useState(false);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      setUser({
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        sub: firebaseUser.uid, // Use uid instead of sub
        picture: firebaseUser.photoURL
      });
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
  });
  return () => unsubscribe();
}, []);

// Login function
const handleLogin = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error('Login error:', error);
  }
};

// Logout function
const handleLogout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

#### Step 4: Update User ID Usage

Firebase Auth uses `uid` instead of Auth0's `sub`:

```jsx
// OLD
const userId = user.sub; // auth0|xxxxx

// NEW
const userId = user.uid; // Firebase UID (simpler, no prefix)
```

#### Step 5: Update Email/Password Sign-in (if needed)

If you want email/password login:

```jsx
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

// Sign up
const handleEmailSignUp = async (email, password) => {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Sign up error:', error);
  }
};

// Sign in
const handleEmailSignIn = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Sign in error:', error);
  }
};
```

### 3. Update Firestore Security Rules

Firebase Auth uses `request.auth.uid` instead of Auth0's token:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Jobs - public read for active jobs
    match /jobs/{jobId} {
      allow read: if resource.data.status == 'active' || request.auth != null;
      allow create, update, delete: if isAuthenticated();
    }
    
    // Company Members
    match /companyMembers/{memberId} {
      allow read: if isAuthenticated() && (
        resource.data.email == request.auth.token.email ||
        resource.data.userId == request.auth.uid
      );
      allow create: if isAuthenticated() && 
        request.resource.data.email == request.auth.token.email &&
        request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && (
        resource.data.userId == request.auth.uid ||
        // Admin can update
        (exists(/databases/$(database)/documents/companyMembers/$(resource.data.companyId + '_' + request.auth.uid)) &&
         get(/databases/$(database)/documents/companyMembers/$(resource.data.companyId + '_' + request.auth.uid)).data.isAdmin == true)
      );
    }
    
    // Companies
    match /companies/{companyId} {
      allow read: if isAuthenticated() && 
        exists(/databases/$(database)/documents/companyMembers/$(companyId + '_' + request.auth.uid));
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        (get(/databases/$(database)/documents/companyMembers/$(companyId + '_' + request.auth.uid)).data.isAdmin == true ||
         resource.data.adminUserId == request.auth.uid);
    }
  }
}
```

### 4. Benefits After Migration

1. **No Email Mismatches**: Firebase Auth uses the actual Google account email
2. **Simpler Code**: No Auth0 provider, fewer dependencies
3. **Better Performance**: Direct Firebase connection
4. **Easier Debugging**: Firebase console shows all users
5. **Free Tier**: Generous free limits

### 5. Testing Checklist

- [ ] Public job board loads without authentication
- [ ] Google sign-in works
- [ ] User data is created in Firestore
- [ ] Admin status works for @consultant.com emails
- [ ] Dashboard loads correctly
- [ ] Logout works
- [ ] Firestore rules allow proper access

## Quick Start: Minimal Changes

If you want to migrate quickly, here's the minimal change needed:

1. Remove `@auth0/auth0-react` dependency
2. Replace `useAuth0()` with Firebase Auth `onAuthStateChanged`
3. Replace `loginWithRedirect` with `signInWithPopup(auth, googleProvider)`
4. Replace `logout()` with `signOut(auth)`
5. Change `user.sub` to `user.uid` everywhere
6. Update Firestore rules to use `request.auth.uid` instead of Auth0 tokens

The rest of your code (company creation, member records, etc.) should work the same!

