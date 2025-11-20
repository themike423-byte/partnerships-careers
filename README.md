# Partnerships Careers

A modern job board website for partnership roles, built with React, Vite, Firebase, and Tailwind CSS.

## Features

- 🎯 **Job Board**: Browse and filter partnership jobs by level and category
- ⭐ **Featured Jobs**: Employers can pay to feature their job listings
- 👔 **Employer Dashboard**: Track job performance with analytics (views, clicks, CTR)
- 🔐 **Authentication**: Email/password and Google sign-in for employers
- 💳 **Stripe Integration**: Payment processing for featured job postings
- 📊 **Analytics**: Track job views and clicks in real-time

## Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Payments**: Stripe
- **Data Storage**: Sheety API (Google Sheets backend)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Authentication and Firestore enabled
- Stripe account (for payment processing)
- Sheety API setup (Google Sheets)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/themike423-byte/partnerships-careers.git
cd partnerships-careers
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Update `src/firebase.js` with your Firebase configuration
   - Enable Authentication (Email/Password and Google)
   - Set up Firestore database

4. Configure environment variables (for Vercel):
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `STRIPE_PRICE_ID`: Your Stripe price ID for $99 job postings
   - `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret
   - `FIREBASE_PROJECT_ID`: Firebase project ID
   - `FIREBASE_CLIENT_EMAIL`: Firebase service account email
   - `FIREBASE_PRIVATE_KEY`: Firebase service account private key
   - `SITE_URL`: Your site URL (e.g., https://partnerships-careers.vercel.app)

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Project Structure

```
partnerships-careers/
├── api/                    # Vercel serverless functions
│   ├── create-checkout.js  # Stripe checkout session creation
│   ├── stripe-webhook.js   # Stripe webhook handler
│   ├── track-click.js      # Track job click analytics
│   └── track-view.js       # Track job view analytics
├── src/
│   ├── App.jsx             # Main React component
│   ├── firebase.js         # Firebase configuration
│   ├── main.jsx            # React entry point
│   └── index.css           # Tailwind CSS imports
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
└── vercel.json             # Vercel deployment configuration
```

## API Endpoints

### `/api/create-checkout`
Creates a Stripe checkout session for job postings.

**Request Body:**
```json
{
  "type": "new" | "promote",
  "employerId": "string",
  "company": "string",
  "jobId": "string (for promote)",
  "jobTitle": "string (for promote)"
}
```

### `/api/stripe-webhook`
Handles Stripe webhook events for payment confirmation.

### `/api/track-click`
Tracks when users click "Apply Now" on a job.

### `/api/track-view`
Tracks when users view a job listing.

## Deployment

This project is configured for deployment on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

The API routes in the `api/` folder will automatically be deployed as Vercel serverless functions.

## License

MIT
