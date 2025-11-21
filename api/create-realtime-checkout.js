// Vercel Serverless Function to create Stripe Checkout Session for realtime alerts
import Stripe from 'stripe';
import admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000';

    // Check if alert already exists
    const alertsRef = db.collection('jobAlerts');
    const existingQuery = await alertsRef.where('email', '==', normalizedEmail).limit(1).get();
    
    let alertId;
    if (!existingQuery.empty) {
      alertId = existingQuery.docs[0].id;
    } else {
      // Create alert record first (will be updated after payment)
      const newAlertRef = await alertsRef.add({
        email: normalizedEmail,
        frequency: 'realtime',
        subscribedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: false, // Will be activated after payment
        paymentPending: true
      });
      alertId = newAlertRef.id;
    }

    // Get price ID from environment variable or use default
    const priceId = process.env.STRIPE_REALTIME_ALERTS_PRICE_ID || 'price_1SW0FACaW2Du37V1Xwv0hG6w';

    // Create Stripe Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      customer_email: normalizedEmail,
      success_url: `${baseUrl}?alert_subscription=success&alert_id=${alertId}`,
      cancel_url: `${baseUrl}?alert_subscription=cancelled`,
      metadata: {
        type: 'realtime_alerts',
        email: normalizedEmail,
        alertId: alertId
      },
      subscription_data: {
        metadata: {
          email: normalizedEmail,
          alertId: alertId
        }
      }
    });

    return res.status(200).json({ 
      sessionId: session.id, 
      url: session.url 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session', 
      message: error.message 
    });
  }
};

