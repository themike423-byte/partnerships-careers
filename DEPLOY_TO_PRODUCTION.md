# Deploy to Production - Step by Step Guide

This guide will walk you through deploying your website to Vercel so it's live on the internet!

## Prerequisites Checklist

Before deploying, make sure you have:
- [ ] GitHub account (free)
- [ ] Vercel account (free)
- [ ] Firebase project set up
- [ ] Stripe account (for payments)
- [ ] All environment variables ready

## Step 1: Push Code to GitHub

### Option A: Using GitHub Desktop (Easiest)

1. **Install GitHub Desktop** (if you don't have it):
   - Go to: https://desktop.github.com/
   - Download and install

2. **Open GitHub Desktop**:
   - Click "File" → "Add Local Repository"
   - Browse to: `C:\Users\mikes\partnerships-careers`
   - Click "Add repository"

3. **Commit your changes**:
   - You'll see a list of changed files
   - At the bottom, type a message like: "Migrated to Firestore and added local dev mode"
   - Click "Commit to main"

4. **Publish to GitHub**:
   - Click "Publish repository" button (top right)
   - Make it **Public** (or Private if you prefer)
   - Click "Publish repository"
   - Wait for it to finish

### Option B: Using Command Line

If you prefer command line:
```bash
cd C:\Users\mikes\partnerships-careers
git init
git add .
git commit -m "Initial commit - Firestore migration"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/partnerships-careers.git
git push -u origin main
```

## Step 2: Deploy to Vercel

1. **Go to Vercel**:
   - Visit: https://vercel.com/
   - Click "Sign up" (or "Log in" if you have an account)
   - **Sign in with GitHub** (easiest option)

2. **Import Your Project**:
   - Click "Add New..." → "Project"
   - You'll see your GitHub repositories
   - Find "partnerships-careers" and click "Import"

3. **Configure Project**:
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build` (should be auto-filled)
   - **Output Directory**: `dist` (should be auto-filled)
   - Click "Deploy" (but wait - we need to add environment variables first!)

## Step 3: Add Environment Variables

**IMPORTANT**: Before clicking "Deploy", add these environment variables:

1. **In Vercel**, before deploying, click "Environment Variables" section

2. **Add each of these** (click "Add" for each one):

   **Firebase:**
   - Name: `FIREBASE_PROJECT_ID`
   - Value: `partnerships-careers`
   
   - Name: `FIREBASE_CLIENT_EMAIL`
   - Value: `firebase-adminsdk-fbsvc@partnerships-careers.iam.gserviceaccount.com`
     (from your serviceAccountKey.json file)
   
   - Name: `FIREBASE_PRIVATE_KEY`
   - Value: (The entire private_key from serviceAccountKey.json - copy the whole thing including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

   **Stripe:**
   - Name: `STRIPE_SECRET_KEY`
   - Value: `sk_test_...` (your Stripe secret key from Stripe dashboard)
   
   - Name: `STRIPE_PRICE_ID`
   - Value: `price_...` (your Stripe price ID)
   
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: (We'll get this after first deployment - leave empty for now)

   **Site URL:**
   - Name: `SITE_URL`
   - Value: (Leave empty for now - we'll update after deployment)

3. **Click "Deploy"** after adding all variables

## Step 4: Wait for Deployment

- Vercel will build and deploy your site
- This takes 2-3 minutes
- You'll see progress in real-time
- When done, you'll get a URL like: `https://partnerships-careers-abc123.vercel.app`

## Step 5: Update Environment Variables

After deployment:

1. **Update SITE_URL**:
   - Go to Vercel → Your Project → Settings → Environment Variables
   - Edit `SITE_URL`
   - Set it to your Vercel URL: `https://your-project-name.vercel.app`
   - Save

2. **Set Up Stripe Webhook**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://your-vercel-url.vercel.app/api/stripe-webhook`
   - Select event: `checkout.session.completed`
   - Click "Add endpoint"
   - Copy the "Signing secret"
   - Go back to Vercel → Environment Variables
   - Update `STRIPE_WEBHOOK_SECRET` with the signing secret
   - Redeploy (Vercel → Deployments → Click the three dots → Redeploy)

## Step 6: Test Your Live Site!

1. Visit your Vercel URL
2. Test logging in
3. Test posting a job (payment will work now!)
4. Check that jobs display correctly

## Troubleshooting

**Build fails:**
- Check the build logs in Vercel
- Make sure all dependencies are in `package.json`
- Check for any syntax errors

**Environment variables not working:**
- Make sure you added them before deploying
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

**Stripe payments not working:**
- Make sure all Stripe keys are correct
- Check webhook is set up
- Use test mode keys for testing

**Firebase errors:**
- Verify Firestore rules are set (see FIRESTORE_MIGRATION_COMPLETE.md)
- Check Firebase config is correct

## Need Help?

If you get stuck at any step, let me know:
- What step you're on
- What error message you see
- Screenshot if possible

I'll help you fix it!

---

**Ready to deploy?** Follow the steps above, and let me know if you need help at any point!

