# Local API Development Setup

## The Problem
The API endpoints (`/api/*`) are Vercel serverless functions that only work when deployed to Vercel. When running `npm run dev` with Vite, these endpoints return 404 errors.

## Solution: Use Vercel CLI for Local Development

To test API endpoints locally, you need to use Vercel CLI:

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Link your project (if not already linked)
```bash
vercel link
```

### 4. Run with Vercel Dev
```bash
npm run dev:vercel
```

This will:
- Start Vite dev server on port 3000
- Run serverless functions locally
- Make API endpoints accessible at `/api/*`

## Alternative: Deploy to Vercel Preview

For testing the full flow including Stripe checkout:
1. Push your code to GitHub
2. Deploy to Vercel (or use `vercel` command)
3. Test on the deployed preview URL

## Environment Variables

Make sure you have these set in Vercel (or `.env.local` when using `vercel dev`):
- `STRIPE_SECRET_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_SITE_URL` (or `SITE_URL`)

