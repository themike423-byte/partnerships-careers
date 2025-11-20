# Complete GitHub Commit Guide

## 🎯 What to Commit to GitHub

### ✅ Files That MUST Be Committed

#### Source Code
- `src/` (entire folder)
  - `App.jsx`
  - `firebase.js`
  - `main.jsx`
  - `index.css`
  - All other files in `src/`

#### API Routes
- `api/` (entire folder)
  - `create-checkout.js`
  - `create-payment-intent.js` ⭐ NEW
  - `confirm-payment.js` ⭐ NEW
  - `stripe-webhook.js`
  - `reset-password.js`
  - `track-click.js`
  - `track-learn-more.js`
  - `track-view.js`

#### Configuration Files
- `package.json` ⭐ UPDATED (includes Stripe packages)
- `package-lock.json`
- `vite.config.js`
- `tailwind.config.js`
- `postcss.config.js`
- `vercel.json` ⭐ UPDATED (includes new API routes)
- `index.html`
- `.gitignore` ⭐ UPDATED (includes .env)

#### Documentation
- `README.md`
- `DEPLOYMENT_CHECKLIST.md` ⭐ NEW
- `ENVIRONMENT_VARIABLES.md` ⭐ NEW
- `GITHUB_COMMIT_GUIDE.md` ⭐ NEW (this file)
- All other `.md` files

#### Other
- `scripts/` folder (if exists)
- Any other configuration files

### ❌ Files That MUST NOT Be Committed

- `.env` (contains secrets)
- `node_modules/` (will be installed on Vercel)
- `dist/` (build output)
- `serviceAccountKey.json` (Firebase secrets)
- `.vscode/`, `.idea/` (IDE settings)
- Any temporary files

---

## 📋 Pre-Commit Checklist

Before committing, verify:

- [ ] `.env` is in `.gitignore` ✅
- [ ] `serviceAccountKey.json` is in `.gitignore` ✅
- [ ] `node_modules/` is in `.gitignore` ✅
- [ ] All new API files are present (`create-payment-intent.js`, `confirm-payment.js`)
- [ ] `package.json` includes Stripe packages
- [ ] `vercel.json` includes new API routes
- [ ] Code builds successfully (`npm run build`)

---

## 🚀 Commit Commands

### Option 1: Using GitHub Desktop (Easiest)

1. Open GitHub Desktop
2. Review the "Changes" tab
3. **Verify these files are NOT listed:**
   - `.env`
   - `serviceAccountKey.json`
   - `node_modules/`
4. **Verify these files ARE listed:**
   - `api/create-payment-intent.js`
   - `api/confirm-payment.js`
   - `package.json`
   - `vercel.json`
   - `src/App.jsx`
5. Write commit message: `"Add Stripe embedded payment integration and deployment configuration"`
6. Click "Commit to main"
7. Click "Push origin"

### Option 2: Using Command Line

```bash
# Check what will be committed
git status

# Add all files (gitignore will exclude .env, etc.)
git add .

# Verify .env is NOT being added
git status | grep .env
# (Should return nothing)

# Commit
git commit -m "Add Stripe embedded payment integration and deployment configuration"

# Push to GitHub
git push origin main
```

---

## 🔍 Verify Before Pushing

Run these commands to double-check:

```bash
# Check if .env would be committed (should return nothing)
git status | grep "\.env"

# Check if serviceAccountKey.json would be committed (should return nothing)
git status | grep "serviceAccountKey"

# List files that WILL be committed
git status --short
```

---

## 📦 What Gets Deployed

When you push to GitHub and connect to Vercel:

1. **Vercel will:**
   - Clone your repository
   - Run `npm install` (installs all dependencies from `package.json`)
   - Run `npm run build` (builds your app)
   - Deploy the `dist/` folder

2. **API routes** in `api/` folder become Vercel serverless functions

3. **Environment variables** you set in Vercel dashboard are injected at build/runtime

---

## ⚠️ Critical: Environment Variables

**DO NOT commit `.env` file!**

Instead, add environment variables in:
- **Vercel Dashboard** → Your Project → Settings → Environment Variables

See `ENVIRONMENT_VARIABLES.md` for the complete list.

---

## ✅ After Committing

1. **Go to Vercel:** https://vercel.com/
2. **Import your repository**
3. **Add environment variables** (see `DEPLOYMENT_CHECKLIST.md`)
4. **Deploy**

Your site will be live in 2-3 minutes! 🚀

---

## 🆘 Troubleshooting

### "I accidentally committed .env"
```bash
# Remove from git (but keep local file)
git rm --cached .env
git commit -m "Remove .env from repository"
git push
```

### "Build fails on Vercel"
- Check build logs in Vercel dashboard
- Verify all dependencies in `package.json`
- Check for syntax errors

### "Environment variables not working"
- Make sure variables are set in Vercel (not just in `.env`)
- Redeploy after adding variables
- Check variable names match exactly

---

## 📝 Quick Reference

**Files to commit:** Everything except `.env`, `node_modules/`, `dist/`, `serviceAccountKey.json`

**Commit message:** `"Add Stripe embedded payment integration and deployment configuration"`

**Next step:** Push to GitHub, then deploy on Vercel

---

**Ready? Follow the steps above and your site will be live! 🎉**

