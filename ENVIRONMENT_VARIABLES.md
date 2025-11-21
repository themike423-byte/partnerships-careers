# Environment Variables Reference

## For Local Development (.env file)

Create a `.env` file in the project root:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (your Stripe publishable key from Stripe Dashboard)

# Payment Amount (in cents) - $99 = 9900 cents
STRIPE_AMOUNT=9900
```

**Note:** `.env` is already in `.gitignore` and will NOT be committed to GitHub.

---

## For Vercel Production

Add these in **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Required Variables

#### Firebase
```
FIREBASE_PROJECT_ID = partnerships-careers
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-fbsvc@partnerships-careers.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY = (entire private key from serviceAccountKey.json)
```

#### Stripe
```
STRIPE_SECRET_KEY = sk_test_... (your Stripe secret key from Stripe Dashboard)
STRIPE_AMOUNT = 9900
VITE_STRIPE_PUBLISHABLE_KEY = pk_test_... (your Stripe publishable key from Stripe Dashboard)
```

#### LinkedIn
```
VITE_LINKEDIN_CLIENT_ID = 7719ehan5tequ0
LINKEDIN_CLIENT_SECRET = (your LinkedIn client secret from LinkedIn Developers dashboard)
```

#### Site Configuration
```
SITE_URL = https://your-vercel-url.vercel.app
```

#### Stripe Webhook (Add After First Deployment)
```
STRIPE_WEBHOOK_SECRET = whsec_... (from Stripe webhook setup)
```

#### Hugging Face AI (For Job Parsing)
```
HUGGINGFACE_API_KEY = hf_... (your Hugging Face access token)
HUGGINGFACE_MODEL = mistralai/Mistral-7B-Instruct-v0.2 (optional - defaults to Mistral)
```

---

## How to Get Each Value

### Firebase Values

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Extract:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (copy entire value including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)

### Stripe Values

1. Go to Stripe Dashboard → Developers → API Keys
2. **Publishable key:** Copy the "Publishable key" (starts with `pk_test_` or `pk_live_`)
3. **Secret key:** Click "Reveal test key" and copy (starts with `sk_test_` or `sk_live_`)
4. **Webhook secret:** Set up webhook first (see DEPLOYMENT_CHECKLIST.md Step 5)

### SITE_URL

1. After first deployment, Vercel gives you a URL
2. Copy that URL and set as `SITE_URL`
3. Example: `https://partnerships-careers-abc123.vercel.app`

### Hugging Face API Key

1. Go to [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Click "New token"
3. Give it a name (e.g., "Partnerships Careers")
4. Select "Read" access (or "Write" if you need to use private models)
5. Click "Generate token"
6. Copy the token (starts with `hf_`)
7. Add to Vercel as `HUGGINGFACE_API_KEY`

**Note:** The default model is `mistralai/Mistral-7B-Instruct-v0.2`. You can change it by setting `HUGGINGFACE_MODEL` to any compatible model on Hugging Face.

---

## Important Notes

- **VITE_ prefix:** Variables starting with `VITE_` are exposed to the browser. Only use for public keys.
- **Secret keys:** Never commit secret keys to GitHub. Always use environment variables.
- **Multiple environments:** In Vercel, you can set different values for Production, Preview, and Development.
- **Redeploy:** After adding/updating environment variables, you may need to redeploy.

---

## Quick Copy-Paste for Vercel

Copy this list and fill in the values:

```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
STRIPE_SECRET_KEY=
STRIPE_AMOUNT=9900
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_LINKEDIN_CLIENT_ID=7719ehan5tequ0
LINKEDIN_CLIENT_SECRET=
SITE_URL=
STRIPE_WEBHOOK_SECRET=
HUGGINGFACE_API_KEY=
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

