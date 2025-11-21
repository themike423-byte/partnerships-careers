// Shared Firebase Admin initialization helper
import admin from 'firebase-admin';

let initialized = false;

export function initializeFirebaseAdmin() {
  if (initialized || admin.apps.length > 0) {
    return admin.firestore();
  }

  // Handle private key formatting - ensure it has proper newlines
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  
  if (!privateKey) {
    throw new Error('FIREBASE_PRIVATE_KEY environment variable is not set');
  }
  
  // Replace escaped newlines with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  // Ensure the key has proper BEGIN/END markers
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    // If it's missing the header, try to add it
    if (!privateKey.startsWith('-----BEGIN')) {
      // Remove any existing whitespace/newlines
      privateKey = privateKey.trim();
      // Add proper headers
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
    }
  }
  
  // Validate required environment variables
  if (!process.env.FIREBASE_PROJECT_ID) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is not set');
  }
  
  if (!process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('FIREBASE_CLIENT_EMAIL environment variable is not set');
  }
  
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    initialized = true;
    return admin.firestore();
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    throw new Error(`Failed to initialize Firebase Admin: ${error.message}`);
  }
}

export function getFirestore() {
  if (!initialized && admin.apps.length === 0) {
    return initializeFirebaseAdmin();
  }
  return admin.firestore();
}

