/**
 * Script to reset the admin password for themike423@gmail.com
 * 
 * Usage:
 * 1. Make sure you have firebase-admin installed: npm install firebase-admin
 * 2. Run: node scripts/reset-admin-password.js
 * 
 * This will reset the password for themike423@gmail.com to @Password1
 */

import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your service account key - try multiple locations
let serviceAccountPath;

// Option 1: In user's Downloads folder (Windows)
const userHome = process.env.USERPROFILE || process.env.HOME || '';
if (userHome) {
    serviceAccountPath = path.join(userHome, 'Downloads', 'partnerships-careers-firebase-adminsdk-fbsvc-ac91231fc9.json');
}

// Option 2: In project root
if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    serviceAccountPath = path.join(__dirname, '..', 'partnerships-careers-firebase-adminsdk-fbsvc-ac91231fc9.json');
}

// Option 3: In scripts folder
if (!fs.existsSync(serviceAccountPath)) {
    serviceAccountPath = path.join(__dirname, 'partnerships-careers-firebase-adminsdk-fbsvc-ac91231fc9.json');
}

// Check if service account file exists
if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Service account file not found.');
    console.error('Please place the Firebase Admin SDK JSON file in one of these locations:');
    console.error('  1. Your Downloads folder:', path.join(userHome || '~', 'Downloads'));
    console.error('  2. Project root:', path.join(__dirname, '..'));
    console.error('  3. Scripts folder:', __dirname);
    console.error('\nOr update the script with the correct path to your service account file.');
    process.exit(1);
}

console.log('📁 Using service account file:', serviceAccountPath);

// Initialize Firebase Admin
// Read and parse the JSON file for ES modules
const serviceAccountData = fs.readFileSync(serviceAccountPath, 'utf8');
const serviceAccount = JSON.parse(serviceAccountData);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const adminEmail = 'themike423@gmail.com';
const newPassword = '@Password1';

async function resetPassword() {
    try {
        console.log(`🔄 Checking for account with email ${adminEmail}...`);
        
        // Get user by email
        let user;
        try {
            user = await admin.auth().getUserByEmail(adminEmail);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.error(`❌ No account found with email ${adminEmail}.`);
                console.error('Please sign up first using Google OAuth or email/password.');
                process.exit(1);
            }
            throw error;
        }
        
        console.log(`✅ Found account: ${user.uid}`);
        console.log(`📧 Email: ${user.email}`);
        console.log(`🔐 Providers: ${user.providerData.map(p => p.providerId).join(', ')}`);
        
        // Check if user has email/password provider
        const hasEmailPassword = user.providerData.some(p => p.providerId === 'password');
        const hasGoogle = user.providerData.some(p => p.providerId === 'google.com');
        
        if (!hasEmailPassword) {
            console.log('\n⚠️  Account exists but does not have email/password authentication.');
            console.log('📝 Adding email/password provider to existing account...');
            
            // Create email/password credential and link it
            // Note: We can't directly link without the user being signed in
            // So we'll just set the password, which will enable email/password login
            await admin.auth().updateUser(user.uid, {
                password: newPassword,
                email: adminEmail,
                emailVerified: true // Mark email as verified since it's from Google OAuth
            });
            
            console.log(`✅ Email/password authentication added to account!`);
            if (hasGoogle) {
                console.log('🔗 Your Google OAuth and email/password now use the same account.');
            }
        } else {
            console.log('\n🔄 Updating existing email/password...');
            await admin.auth().updateUser(user.uid, {
                password: newPassword
            });
            console.log(`✅ Password updated!`);
        }
        
        console.log(`\n📧 Email: ${adminEmail}`);
        console.log(`🔑 New Password: ${newPassword}`);
        console.log('\n✅ You can now sign in with either:');
        console.log('   - Google OAuth (same account)');
        console.log('   - Email/Password: ' + adminEmail + ' / ' + newPassword);
        console.log('\n⚠️  Please save this password securely and change it after first login.');
        
    } catch (error) {
        console.error('❌ Error resetting password:', error.message);
        if (error.code === 'auth/user-not-found') {
            console.error(`User ${adminEmail} does not exist. Please create the account first.`);
        } else if (error.code === 'auth/email-already-exists') {
            console.error('An account with this email already exists with a different provider.');
        }
        process.exit(1);
    } finally {
        // Clean up
        if (admin.apps.length) {
            await admin.app().delete();
        }
    }
}

// Run the script
resetPassword();

