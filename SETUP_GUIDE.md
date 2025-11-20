# Step-by-Step Setup Guide (For Non-Technical Users)

This guide will walk you through setting up your job board website step by step.

## Step 1: Run the Website Locally (See It Working)

### What you need:
- A computer with internet
- That's it!

### Instructions:

1. **Open Command Prompt or PowerShell** (on Windows):
   - Press the `Windows` key
   - Type "PowerShell" or "Command Prompt"
   - Click on it to open

2. **Navigate to your project folder**:
   - Type this command and press Enter:
   ```
   cd C:\Users\mikes\partnerships-careers
   ```

3. **Start the website**:
   - Type this command and press Enter:
   ```
   npm run dev
   ```

4. **View your website**:
   - Wait a few seconds
   - You should see a message like "Local: http://localhost:3000"
   - Open your web browser (Chrome, Firefox, etc.)
   - Type `http://localhost:3000` in the address bar
   - Press Enter
   - Your website should appear!

**Note:** Keep the PowerShell window open while you're viewing the website. To stop it, press `Ctrl + C` in the PowerShell window.

---

## Step 2: Set Up Firebase (For User Login)

Firebase lets employers log in to post jobs. Think of it as the "login system" for your website.

### What you need:
- A Google account (Gmail)

### Instructions:

1. **Go to Firebase**:
   - Open your browser
   - Go to: https://console.firebase.google.com/
   - Sign in with your Google account

2. **Create a New Project**:
   - Click "Add project" or "Create a project"
   - Give it a name: "Partnerships Careers" (or whatever you want)
   - Click "Continue"
   - Disable Google Analytics (unless you want it) - click "Continue"
   - Click "Create project"
   - Wait for it to finish (about 30 seconds)
   - Click "Continue"

3. **Enable Authentication**:
   - In the left sidebar, click "Authentication"
   - Click "Get started"
   - Click on "Sign-in method" tab
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"
   - Click on "Google"
   - Toggle "Enable" to ON
   - Enter your email as the support email
   - Click "Save"

4. **Enable Firestore Database**:
   - In the left sidebar, click "Firestore Database"
   - Click "Create database"
   - Select "Start in test mode" (for now)
   - Click "Next"
   - Choose a location (pick the closest to you)
   - Click "Enable"

5. **Get Your Firebase Configuration**:
   - In the left sidebar, click the gear icon ⚙️ next to "Project Overview"
   - Click "Project settings"
   - Scroll down to "Your apps" section
   - Click the `</>` icon (for web)
   - Register app name: "Partnerships Careers"
   - Click "Register app"
   - You'll see a code block with your config - **copy it!**
   - It looks like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

6. **Update Your Website with Firebase Config**:
   - Go back to your project folder
   - Open the file `src/firebase.js` in a text editor (Notepad works, or use VS Code if you have it)
   - Replace the existing `firebaseConfig` object with the one you copied from Firebase
   - Save the file

**✅ Firebase is now set up!**

---

## Step 3: Set Up Stripe (For Payments)

Stripe handles payments when employers want to post featured jobs ($99).

### What you need:
- An email address
- A bank account (to receive payments)

### Instructions:

1. **Create a Stripe Account**:
   - Go to: https://stripe.com/
   - Click "Start now" or "Sign up"
   - Enter your email and create a password
   - Complete the signup process
   - Verify your email

2. **Complete Your Stripe Account Setup**:
   - Stripe will ask you business details
   - Fill in your information:
     - Business type (Individual or Company)
     - Business name
     - Country
     - Address
   - Add your bank account details (where you want money to go)
   - This may take a few minutes

3. **Get Your Stripe Keys**:
   - Once logged in, click "Developers" in the top menu
   - Click "API keys" in the left sidebar
   - You'll see two keys:
     - **Publishable key** (starts with `pk_`) - This is safe to share
     - **Secret key** (starts with `sk_`) - **KEEP THIS SECRET!**
   - Click "Reveal test key" to see your test secret key
   - **Copy both keys and save them somewhere safe**

4. **Create a Product/Price**:
   - Click "Products" in the left sidebar
   - Click "Add product"
   - Name: "Featured Job Posting"
   - Description: "30-day featured job listing"
   - Pricing: 
     - Model: "Standard pricing"
     - Price: `99.00`
     - Currency: `USD`
     - Billing: "One time"
   - Click "Save product"
   - After saving, click on the product
   - Find the "Price ID" - it looks like `price_1ABC123...`
   - **Copy this Price ID and save it**

**✅ Stripe is now set up!**

---

## Step 4: Set Up Sheety (For Job Listings Storage)

Sheety connects your website to a Google Sheet where all job listings are stored.

### What you need:
- A Google account

### Instructions:

1. **Create a Google Sheet**:
   - Go to: https://sheets.google.com/
   - Click "Blank" to create a new spreadsheet
   - Name it: "Partnerships Careers Database"

2. **Set Up the Sheet Structure**:
   - In the first row (Row 1), add these column headers:
     - `id` (leave empty, auto-generated)
     - `title`
     - `company`
     - `location`
     - `type`
     - `salaryRange`
     - `level`
     - `category`
     - `description`
     - `postedDate`
     - `isFeatured`
     - `employerId`
     - `link`
     - `featuredExpiryDate`
     - `totalViews`
     - `totalClicks`
     - `status`

3. **Set Up Sheety**:
   - Go to: https://sheety.co/
   - Sign up for a free account (or sign in)
   - Click "New Project"
   - Click "Google Sheets"
   - Authorize Sheety to access your Google account
   - Select the "Partnerships Careers Database" sheet you just created
   - Click "Start"
   - Sheety will give you an API URL - it looks like:
     `https://api.sheety.co/YOUR_ID/partnershipsCareersDb/sheet1`
   - **Copy this URL and save it**

4. **Update Your Website with Sheety URL**:
   - Open `src/App.jsx` in a text editor
   - Find the line that says: `const SHEETY_API = 'https://api.sheety.co/...'`
   - Replace it with your Sheety API URL
   - Save the file

**✅ Sheety is now set up!**

---

## Step 5: Deploy to Vercel (Make It Live on the Internet)

Vercel will host your website so anyone can access it online.

### What you need:
- A GitHub account (free)
- All the keys from previous steps

### Instructions:

1. **Create a GitHub Account** (if you don't have one):
   - Go to: https://github.com/
   - Click "Sign up"
   - Create a free account

2. **Upload Your Code to GitHub**:
   - Install GitHub Desktop (easier than command line):
     - Go to: https://desktop.github.com/
     - Download and install it
   - Open GitHub Desktop
   - Sign in with your GitHub account
   - Click "File" → "Add Local Repository"
   - Browse to: `C:\Users\mikes\partnerships-careers`
   - Click "Add repository"
   - Click "Publish repository"
   - Make it public or private (your choice)
   - Click "Publish repository"

3. **Deploy to Vercel**:
   - Go to: https://vercel.com/
   - Click "Sign up" and sign in with GitHub
   - Click "Add New..." → "Project"
   - Find your "partnerships-careers" repository
   - Click "Import"
   - **Add Environment Variables** (this is important!):
     - Click "Environment Variables"
     - Add each of these (use the values you saved earlier):
       
       **Name:** `STRIPE_SECRET_KEY`  
       **Value:** (Your Stripe secret key - starts with `sk_`)
       
       **Name:** `STRIPE_PRICE_ID`  
       **Value:** (Your Stripe price ID - starts with `price_`)
       
       **Name:** `STRIPE_WEBHOOK_SECRET`  
       **Value:** (We'll get this in step 4)
       
       **Name:** `FIREBASE_PROJECT_ID`  
       **Value:** (From your Firebase config - the `projectId` value)
       
       **Name:** `FIREBASE_CLIENT_EMAIL`  
       **Value:** (We'll get this in step 5)
       
       **Name:** `FIREBASE_PRIVATE_KEY`  
       **Value:** (We'll get this in step 5)
       
       **Name:** `SITE_URL`  
       **Value:** (Leave empty for now, we'll update after deployment)
     
     - Click "Save" after adding each one

4. **Get Stripe Webhook Secret**:
   - Go back to Stripe
   - Click "Developers" → "Webhooks"
   - Click "Add endpoint"
   - Endpoint URL: `https://YOUR-VERCEL-URL.vercel.app/api/stripe-webhook`
     (Replace YOUR-VERCEL-URL with your actual Vercel URL after first deployment)
   - Click "Select events"
   - Check "checkout.session.completed"
   - Click "Add endpoint"
   - Click on the webhook you just created
   - Find "Signing secret" - click "Reveal"
   - Copy it and add it to Vercel as `STRIPE_WEBHOOK_SECRET`

5. **Get Firebase Service Account** (for webhook):
   - Go to Firebase Console
   - Click the gear icon ⚙️ → "Project settings"
   - Click "Service accounts" tab
   - Click "Generate new private key"
   - Click "Generate key"
   - A JSON file will download - open it
   - Copy these values:
     - `project_id` → Use as `FIREBASE_PROJECT_ID` (if different)
     - `client_email` → Use as `FIREBASE_CLIENT_EMAIL`
     - `private_key` → Use as `FIREBASE_PRIVATE_KEY` (copy the entire value including quotes)

6. **Deploy**:
   - Go back to Vercel
   - Click "Deploy"
   - Wait 2-3 minutes
   - When done, you'll get a URL like: `https://partnerships-careers-abc123.vercel.app`
   - **Update `SITE_URL` in environment variables** with this URL
   - **Update Stripe webhook URL** with this URL (from step 4)

7. **Test Your Website**:
   - Visit your Vercel URL
   - Try creating an employer account
   - Try posting a test job (use Stripe test mode)

**✅ Your website is now live!**

---

## Troubleshooting

### Website won't start locally:
- Make sure you ran `npm install` first
- Make sure you're in the right folder (`cd C:\Users\mikes\partnerships-careers`)

### Can't log in:
- Check that Firebase Authentication is enabled
- Make sure you updated `src/firebase.js` with your Firebase config

### Payments not working:
- Make sure all Stripe keys are in Vercel environment variables
- Check that Stripe webhook is set up correctly
- Make sure you're using test mode keys for testing

### Jobs not showing:
- Check that Sheety API URL is correct in `src/App.jsx`
- Make sure your Google Sheet has the right column headers

---

## Need Help?

If you get stuck:
1. Check the error message - it usually tells you what's wrong
2. Make sure all environment variables are set correctly
3. Check that all services (Firebase, Stripe, Sheety) are properly configured

Good luck! 🚀

