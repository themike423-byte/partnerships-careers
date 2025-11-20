# Local Development - Payment Issue Fix

## The Problem
When running locally (`localhost:3000`), the Stripe payment API doesn't work because:
- Vercel serverless functions only work when deployed to Vercel
- Stripe requires environment variables that aren't set locally

## Solution: Development Mode

I've added a development mode that lets you test posting jobs **without payment** when running locally.

### How It Works
- When running on `localhost`, you can post jobs directly without payment
- When deployed to Vercel, payment is required as normal

### To Post a Job Locally (No Payment):
1. Click "Post a Featured Job - $99"
2. Instead of going to Stripe, it will directly show you the job posting form
3. Fill it out and submit
4. Your job will be posted to Firestore!

### To Test Payments:
You need to deploy to Vercel first. Payments only work when the site is live on Vercel.

---

**Note**: This is a temporary solution for local testing. In production (on Vercel), payments will work normally.

