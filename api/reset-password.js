// API endpoint to handle password reset requests
// This uses Firebase Admin SDK to enable password reset even for OAuth-only accounts
// File: api/reset-password.js

const admin = require('firebase-admin');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  // Try to load service account from multiple locations
  let serviceAccount;
  const userHome = process.env.USERPROFILE || process.env.HOME || '';
  
  // Option 1: From environment variables (production)
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  } else {
    // Option 2: From service account file (development)
    let serviceAccountPath;
    
    // Try Downloads folder
    if (userHome) {
      serviceAccountPath = join(userHome, 'Downloads', 'partnerships-careers-firebase-adminsdk-fbsvc-ac91231fc9.json');
    }
    
    // Try project root
    if (!serviceAccountPath || !existsSync(serviceAccountPath)) {
      serviceAccountPath = join(__dirname, '..', 'partnerships-careers-firebase-adminsdk-fbsvc-ac91231fc9.json');
    }
    
    // Try scripts folder
    if (!existsSync(serviceAccountPath)) {
      serviceAccountPath = join(__dirname, '..', 'scripts', 'partnerships-careers-firebase-adminsdk-fbsvc-ac91231fc9.json');
    }
    
    if (existsSync(serviceAccountPath)) {
      const serviceAccountData = readFileSync(serviceAccountPath, 'utf8');
      serviceAccount = JSON.parse(serviceAccountData);
    } else {
      throw new Error('Firebase service account not found. Please set environment variables or place service account file in Downloads folder.');
    }
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    console.log(`🔄 Processing password reset request for: ${email}`);
    
    // Get user by email
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({ 
          error: 'No account found with this email address',
          suggestion: 'If you signed up with Google OAuth, please use "Sign in with Google" instead.'
        });
      }
      throw error;
    }
    
    console.log(`✅ Found user: ${user.uid}, providers: ${user.providerData.map(p => p.providerId).join(', ')}`);
    
    // Check if user has email/password provider
    const hasEmailPassword = user.providerData.some(p => p.providerId === 'password');
    
    if (!hasEmailPassword) {
      // User only has OAuth - we need to generate a password reset link manually
      // Generate a temporary password reset token
      const actionCodeSettings = {
        url: process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin || 'http://localhost:3000',
        handleCodeInApp: false,
      };
      
      // Generate password reset link using Admin SDK
      const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
      
      console.log(`✅ Generated password reset link for OAuth-only account`);
      
      // In production, you would send this link via email service (SendGrid, AWS SES, etc.)
      // For now, we'll return it (in production, don't return the link - send it via email)
      return res.status(200).json({ 
        success: true,
        message: 'Password reset link generated. In production, this would be sent via email.',
        // Only return link in development
        link: process.env.NODE_ENV === 'development' ? link : undefined,
        note: 'Your account currently only has Google OAuth. The reset link will enable email/password authentication.'
      });
    } else {
      // User has email/password - use standard Firebase password reset
      const actionCodeSettings = {
        url: process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin || 'http://localhost:3000',
        handleCodeInApp: false,
      };
      
      const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
      
      console.log(`✅ Generated password reset link for email/password account`);
      
      // In production, send via email service
      return res.status(200).json({ 
        success: true,
        message: 'Password reset link generated. In production, this would be sent via email.',
        link: process.env.NODE_ENV === 'development' ? link : undefined
      });
    }
    
  } catch (error) {
    console.error('❌ Error processing password reset:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to process password reset request',
      code: error.code
    });
  }
}

