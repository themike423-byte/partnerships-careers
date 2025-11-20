# Quick Deploy Guide - 5 Minutes to Production

## What I Can Do For You

I can't directly access your accounts, but I've created scripts and guides to make deployment super easy!

## Super Quick Method (3 Steps)

### Step 1: Run the Deployment Script

Open PowerShell in your project folder and run:
```powershell
.\deploy.ps1
```

This will:
- ✅ Check everything is ready
- ✅ Test that your code builds
- ✅ Tell you what to do next

### Step 2: Push to GitHub

**If you have GitHub Desktop:**
1. Open GitHub Desktop
2. You should see your project
3. Click "Commit to main" (bottom left)
4. Click "Push origin" (top right)

**Or use command line:**
```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### Step 3: Deploy on Vercel

1. Go to https://vercel.com/
2. Sign in with GitHub
3. Click "Add New Project"
4. Select your repository
5. **Add environment variables** (see list below)
6. Click "Deploy"

**Done!** Your site will be live in 2-3 minutes.

## Environment Variables Needed

Copy these into Vercel (Settings → Environment Variables):

### Firebase (from your serviceAccountKey.json):
```
FIREBASE_PROJECT_ID = partnerships-careers
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-fbsvc@partnerships-careers.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY = (the entire private_key from serviceAccountKey.json)
```

### Stripe (from your Stripe dashboard):
```
STRIPE_SECRET_KEY = sk_test_... (your test key)
STRIPE_PRICE_ID = price_... (your price ID)
STRIPE_WEBHOOK_SECRET = (get this after first deploy)
```

### Site URL (after first deploy):
```
SITE_URL = https://your-vercel-url.vercel.app
```

## What I've Prepared For You

✅ **deploy.ps1** - Script to check everything is ready  
✅ **DEPLOY_TO_PRODUCTION.md** - Detailed step-by-step guide  
✅ **All code is ready** - No changes needed  
✅ **Build tested** - Everything compiles correctly  

## Need Help?

Just tell me:
- "I'm on step X"
- "I see this error: ..."
- "Where do I find ..."

And I'll help you through it!

---

**The easiest way:** Run `.\deploy.ps1` and follow what it tells you! 🚀

