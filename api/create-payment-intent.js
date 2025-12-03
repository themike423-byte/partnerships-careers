// Vercel Serverless Function to create Stripe Payment Intent for embedded payment
import Stripe from 'stripe';
import { getFirestore, initializeFirebaseAdmin } from './firebase-admin-init.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { jobData, employerId } = req.body;
    
    if (!jobData || !employerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestore();

    // Store job data in Firestore first (pendingJobs collection)
    // This avoids Stripe metadata 500 character limit
    const pendingJobRef = await db.collection('pendingJobs').add({
      ...jobData,
      employerId: employerId,
      status: 'pending_payment',
      createdAt: new Date().toISOString(),
      paymentIntentId: null, // Will be updated after payment intent creation
    });

    const pendingJobId = pendingJobRef.id;
    console.log('[Payment Intent] Stored job data in Firestore with ID:', pendingJobId);

    // Get price from environment (default to $99 = 9900 cents)
    const amount = process.env.STRIPE_AMOUNT ? parseInt(process.env.STRIPE_AMOUNT) : 9900;

    // Create Payment Intent with only reference ID in metadata (under 500 chars)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      metadata: {
        type: 'new_job',
        employerId: employerId,
        pendingJobId: pendingJobId, // Only store the Firestore document ID
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update pending job with payment intent ID
    await pendingJobRef.update({
      paymentIntentId: paymentIntent.id,
      updatedAt: new Date().toISOString(),
    });

    console.log('[Payment Intent] Created payment intent:', paymentIntent.id);

    res.status(200).json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
    
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
}

