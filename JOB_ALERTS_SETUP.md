# Job Alerts Email System Setup

## Overview
This system allows users to subscribe to job alerts with three frequency options:
- **Daily**: Free daily digest of new jobs
- **Weekly**: Free weekly summary (default)
- **Realtime**: $5/month instant notifications via Stripe subscription

## Environment Variables Required

Add these to your `.env` file or Vercel environment variables:

```bash
# Resend API Key (for sending emails)
# ⚠️ IMPORTANT: Never commit your API key to GitHub!
# Get your API key from: https://resend.com/api-keys
RESEND_API_KEY=your_resend_api_key_here

# Stripe Keys
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Firebase Admin (for database operations)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

# Site URL (for email links and unsubscribe)
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL
```

## API Endpoints Created

### 1. `/api/subscribe-job-alerts.js`
- **Method**: POST
- **Purpose**: Subscribe a user to job alerts
- **Body**: 
  ```json
  {
    "email": "user@example.com",
    "frequency": "daily" | "weekly" | "realtime"
  }
  ```
- **Actions**:
  - Creates/updates job alert in Firestore
  - Creates Stripe subscription if frequency is "realtime"
  - Sends welcome email via Resend
  - Returns alert ID and subscription ID (if applicable)

### 2. `/api/update-alert-frequency.js`
- **Method**: POST
- **Purpose**: Update alert frequency for existing subscribers
- **Body**: Same as subscribe
- **Actions**:
  - Updates frequency in Firestore
  - Creates/cancels Stripe subscription as needed
  - Sends confirmation email

### 3. `/api/unsubscribe.js`
- **Method**: GET (with token) or POST (with email)
- **Purpose**: Unsubscribe from job alerts
- **GET**: `/api/unsubscribe?token=base64encodedtoken`
- **POST Body**: `{ "email": "user@example.com" }`
- **Actions**:
  - Cancels Stripe subscription if exists
  - Marks alert as inactive in Firestore
  - Returns unsubscribe confirmation page

## Database Schema

### Firestore Collection: `jobAlerts`
```javascript
{
  email: string,                    // Normalized lowercase email
  frequency: "daily" | "weekly" | "realtime",
  subscribedAt: string,              // ISO timestamp
  updatedAt: string,                 // ISO timestamp
  isActive: boolean,                 // false if unsubscribed
  stripeCustomerId: string,         // Stripe customer ID (if realtime)
  stripeSubscriptionId: string,      // Stripe subscription ID (if realtime)
  unsubscribedAt: string             // ISO timestamp (if unsubscribed)
}
```

## Email Features

### Welcome Email Includes:
- ✅ Branded Partnerships Careers header with PC logo
- ✅ Confirmation of selected frequency
- ✅ Upgrade prompt for free users (to realtime)
- ✅ Unsubscribe link (legal requirement)
- ✅ Manage preferences link
- ✅ Professional HTML template

### Email Requirements Met:
- ✅ Unsubscribe button/link (legal requirement)
- ✅ Company branding
- ✅ Clear frequency information
- ✅ Professional design
- ✅ Mobile-responsive

## Frontend Integration

The job alerts form in `src/App.jsx` has been updated to:
- Show frequency selection (daily, weekly, realtime)
- Call `/api/subscribe-job-alerts` on submit
- Handle loading states
- Show success/error messages

## Stripe Integration

### Subscription Details:
- **Product**: Partnerships Careers - Realtime Job Alerts
- **Price**: $5.00/month (500 cents)
- **Billing**: Monthly recurring
- **Metadata**: Includes alertId and email for tracking

### Webhook Events to Handle:
You may want to update `api/stripe-webhook.js` to handle:
- `customer.subscription.created` - Confirm subscription active
- `customer.subscription.updated` - Handle plan changes
- `customer.subscription.deleted` - Mark alert as inactive
- `invoice.payment_succeeded` - Confirm payment
- `invoice.payment_failed` - Notify user of payment issue

## Testing

1. **Test Daily/Weekly (Free)**:
   ```bash
   curl -X POST http://localhost:3000/api/subscribe-job-alerts \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","frequency":"weekly"}'
   ```

2. **Test Realtime ($5/month)**:
   ```bash
   curl -X POST http://localhost:3000/api/subscribe-job-alerts \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","frequency":"realtime"}'
   ```

3. **Test Unsubscribe**:
   - Get token from email or generate: `Buffer.from('alertId:email').toString('base64')`
   - Visit: `http://localhost:3000/api/unsubscribe?token=YOUR_TOKEN`

## Next Steps

1. ✅ Set up Resend API key in environment variables
2. ✅ Configure Stripe webhook endpoint in Stripe Dashboard
3. ✅ Update `NEXT_PUBLIC_SITE_URL` to your production URL
4. ✅ Test email delivery
5. ✅ Test Stripe subscription flow
6. ✅ Test unsubscribe flow
7. ⚠️ Consider adding webhook handlers for subscription lifecycle events
8. ⚠️ Consider adding email templates for job alerts (when jobs are posted)

## Notes

- Resend requires domain verification for production use
- Update the "from" email address in API files once domain is verified
- Stripe subscriptions are created immediately for realtime alerts
- Unsubscribe automatically cancels Stripe subscriptions
- All emails include unsubscribe links for legal compliance

