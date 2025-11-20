// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, addDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCkWWc1eVRQ9-7PkPCI2DpCdUvojP4a1B4",
    authDomain: "partnerships-careers.firebaseapp.com",
    projectId: "partnerships-careers",
    storageBucket: "partnerships-careers.firebasestorage.app",
    messagingSenderId: "1056227088220",
    appId: "1:1056227088220:web:e21d57b944758087c79399"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
// Don't explicitly add scopes - Firebase handles this automatically
// Only set prompt to ensure account selection
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// Microsoft OAuth provider
export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
    prompt: 'select_account'
});

// Export Firestore functions for use in components
export { collection, doc, getDocs, addDoc, updateDoc, query, where, orderBy };

