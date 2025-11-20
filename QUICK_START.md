# Quick Start Checklist ✅

Follow these steps in order. Check each box as you complete it.

## Phase 1: See It Working Locally
- [ ] Open PowerShell/Command Prompt
- [ ] Type: `cd C:\Users\mikes\partnerships-careers`
- [ ] Type: `npm run dev`
- [ ] Open browser to `http://localhost:3000`
- [ ] Website appears! ✅

## Phase 2: Set Up Services

### Firebase (Login System)
- [ ] Go to https://console.firebase.google.com/
- [ ] Create new project
- [ ] Enable Authentication (Email/Password + Google)
- [ ] Enable Firestore Database
- [ ] Copy Firebase config
- [ ] Paste into `src/firebase.js`
- [ ] Save file

### Stripe (Payments)
- [ ] Go to https://stripe.com/
- [ ] Create account
- [ ] Complete business setup
- [ ] Copy Secret Key (starts with `sk_`)
- [ ] Create product: "Featured Job Posting" for $99
- [ ] Copy Price ID (starts with `price_`)
- [ ] Save both keys

### Sheety (Job Storage)
- [ ] Go to https://sheets.google.com/
- [ ] Create new spreadsheet
- [ ] Add column headers (see SETUP_GUIDE.md)
- [ ] Go to https://sheety.co/
- [ ] Connect your Google Sheet
- [ ] Copy API URL
- [ ] Paste into `src/App.jsx` (replace SHEETY_API)
- [ ] Save file

## Phase 3: Deploy Online

### GitHub
- [ ] Go to https://github.com/
- [ ] Create account (if needed)
- [ ] Install GitHub Desktop
- [ ] Upload your project folder to GitHub

### Vercel
- [ ] Go to https://vercel.com/
- [ ] Sign in with GitHub
- [ ] Import your project
- [ ] Add all environment variables (see SETUP_GUIDE.md)
- [ ] Click Deploy
- [ ] Copy your live URL
- [ ] Update SITE_URL in Vercel
- [ ] Set up Stripe webhook with your URL

## Phase 4: Test Everything
- [ ] Visit your live website
- [ ] Try creating an employer account
- [ ] Try logging in
- [ ] Try posting a test job (use Stripe test mode)
- [ ] Check that jobs appear on the board

---

**All done? Your website is live! 🎉**

For detailed instructions, see `SETUP_GUIDE.md`

