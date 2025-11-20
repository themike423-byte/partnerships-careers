# Complete Deployment Checklist - GitHub to Production

## 📋 Pre-Deployment Checklist

### ✅ Files to Commit to GitHub

**DO COMMIT:**
- ✅ All source code (`src/` folder)
- ✅ All API routes (`api/` folder)
- ✅ Configuration files:
  - `package.json`
  - `package-lock.json`
  - `vite.config.js`
  - `tailwind.config.js`
  - `postcss.config.js`
  - `vercel.json`
  - `index.html`
- ✅ Documentation files (`.md` files)
- ✅ `.gitignore`

**DO NOT COMMIT:**
- ❌ `.env` (contains secrets)
- ❌ `node_modules/` (will be installed on Vercel)
- ❌ `dist/` (build output)
- ❌ `serviceAccountKey.json` (Firebase secrets)
- ❌ `.vscode/`, `.idea/` (IDE settings)

---

## 🔐 Environment Variables for Vercel

Add these in **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Firebase Configuration
```
FIREBASE_PROJECT_ID = partnerships-careers
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-fbsvc@partnerships-careers.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY = (entire private key from serviceAccountKey.json - include BEGIN/END lines)
```

**How to get Firebase values:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Open the downloaded JSON file
4. Copy:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (copy entire value including quotes)

### Stripe Configuration
```
STRIPE_SECRET_KEY = sk_test_... (your Stripe secret key from Stripe Dashboard)
STRIPE_AMOUNT = 9900
VITE_STRIPE_PUBLISHABLE_KEY = pk_test_... (your Stripe publishable key from Stripe Dashboard)
```

**Note:** 
- `STRIPE_SECRET_KEY` should be your **secret key** (starts with `sk_test_` or `sk_live_`)
- `VITE_STRIPE_PUBLISHABLE_KEY` is the publishable key (starts with `pk_test_` or `pk_live_`)
- `STRIPE_AMOUNT` is in cents (9900 = $99.00)

### Site Configuration
```
SITE_URL = (Leave empty initially, update after first deployment with your Vercel URL)
```

### Stripe Webhook (Add After First Deployment)
```
STRIPE_WEBHOOK_SECRET = (Get this after setting up webhook - see Step 5 below)
```

---

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Code

1. **Verify `.gitignore` includes:**
   - `.env`
   - `node_modules/`
   - `dist/`
   - `serviceAccountKey.json`

2. **Check your code is ready:**
   ```bash
   npm install
   npm run build
   ```
   If build succeeds, you're ready!

### Step 2: Push to GitHub

**Option A: Using GitHub Desktop**
1. Open GitHub Desktop
2. Review changes (make sure `.env` and `serviceAccountKey.json` are NOT included)
3. Write commit message: "Ready for production deployment"
4. Click "Commit to main"
5. Click "Push origin"

**Option B: Using Command Line**
```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### Step 3: Deploy to Vercel

1. **Go to Vercel:** https://vercel.com/
2. **Sign in** with GitHub
3. **Click "Add New Project"**
4. **Import your repository:**
   - Find "partnerships-careers"
   - Click "Import"
5. **Configure Project:**
   - Framework Preset: **Vite** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `dist` (default)
6. **Add Environment Variables** (BEFORE clicking Deploy):
   - Click "Environment Variables" section
   - Add all variables from the list above
   - Make sure to add them for **Production, Preview, and Development**
7. **Click "Deploy"**

### Step 4: Wait for Deployment

- Build takes 2-3 minutes
- Watch the build logs for any errors
- When complete, you'll get a URL like: `https://partnerships-careers-abc123.vercel.app`

### Step 5: Update Environment Variables

1. **Update SITE_URL:**
   - Go to Vercel → Your Project → Settings → Environment Variables
   - Edit `SITE_URL`
   - Set to: `https://your-actual-vercel-url.vercel.app`
   - Save

2. **Set Up Stripe Webhook:**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://your-vercel-url.vercel.app/api/stripe-webhook`
   - Click "Select events"
   - Check: `checkout.session.completed` and `payment_intent.succeeded`
   - Click "Add endpoint"
   - Click on the webhook you created
   - Click "Reveal" next to "Signing secret"
   - Copy the secret
   - Go back to Vercel → Environment Variables
   - Add/Update `STRIPE_WEBHOOK_SECRET` with the secret
   - Redeploy: Vercel → Deployments → Click three dots → Redeploy

### Step 6: Configure Firebase

1. **Firestore Security Rules:**
   - Go to Firebase Console → Firestore Database → Rules
   - Copy rules from `FIRESTORE_MIGRATION_COMPLETE.md` or `FIREBASE_SECURITY_RULES.md`
   - Paste and click "Publish"

2. **Firebase Authentication:**
   - Go to Firebase Console → Authentication
   - Enable sign-in methods:
     - ✅ Email/Password
     - ✅ Google
     - ✅ Microsoft

### Step 7: Test Your Live Site

1. **Visit your Vercel URL**
2. **Test public job board:**
   - View jobs
   - Test filters
   - Test dark mode toggle
3. **Test authentication:**
   - Sign up with email
   - Sign in with Google
   - Sign in with Microsoft
4. **Test employer dashboard:**
   - Log in as employer
   - View dashboard
   - Test job posting form
5. **Test payment flow:**
   - Click "Post a Featured Job"
   - Fill out form
   - Complete payment (use Stripe test card: `4242 4242 4242 4242`)
   - Verify job posts after payment

---

## 🧪 Stripe Test Cards

For testing payments, use these test cards:

**Success:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Decline:**
- Card: `4000 0000 0000 0002`

---

## ✅ Post-Deployment Checklist

- [ ] Site loads correctly
- [ ] Public job board displays jobs
- [ ] Authentication works (email, Google, Microsoft)
- [ ] Employer dashboard loads
- [ ] Job posting form works
- [ ] Payment form appears after form submission
- [ ] Payment processes successfully
- [ ] Job posts to database after payment
- [ ] Dark mode toggle works
- [ ] All environment variables are set
- [ ] Stripe webhook is configured
- [ ] Firestore security rules are published

---

## 🔧 Troubleshooting

### Build Fails
- Check build logs in Vercel
- Verify all dependencies in `package.json`
- Check for syntax errors

### Environment Variables Not Working
- Make sure variables are added for Production, Preview, AND Development
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

### Stripe Payments Not Working
- Verify `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` are correct
- Check webhook is set up
- Use test mode keys for testing
- Check browser console for errors

### Firebase Errors
- Verify Firestore rules are published
- Check Firebase config in `src/firebase.js`
- Verify authentication methods are enabled

### Payment Form Not Showing
- Check browser console for errors
- Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set
- Check network tab for API errors

---

## 📝 Quick Reference

**Your Stripe Keys:**
- Publishable: Get from Stripe Dashboard → Developers → API Keys (starts with `pk_test_` or `pk_live_`)
- Secret: Get from Stripe Dashboard → Developers → API Keys (starts with `sk_test_` or `sk_live_`)

**Payment Amount:** $99.00 (9900 cents)

**Firebase Project:** `partnerships-careers`

---

## 🆘 Need Help?

If you encounter issues:
1. Check the build logs in Vercel
2. Check browser console for errors
3. Verify all environment variables are set
4. Check Stripe Dashboard for payment logs
5. Check Firebase Console for database/auth errors

---

**Ready to deploy? Follow the steps above and your site will be live! 🚀**

