// Vercel Serverless Function to confirm payment and post job to Firestore
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
    const { paymentIntentId } = req.body;
    
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Missing paymentIntentId' });
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin();
    const db = getFirestore();

    // Retrieve the payment intent to verify it was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Retrieve job data from Firestore using pendingJobId
    const pendingJobId = paymentIntent.metadata?.pendingJobId;
    if (!pendingJobId) {
      return res.status(400).json({ error: 'Missing pendingJobId in payment intent metadata' });
    }

    const pendingJobRef = db.collection('pendingJobs').doc(pendingJobId);
    const pendingJobDoc = await pendingJobRef.get();

    if (!pendingJobDoc.exists) {
      return res.status(404).json({ error: 'Pending job not found' });
    }

    const jobData = pendingJobDoc.data();
    
    // Remove internal fields before returning
    const { status, paymentIntentId: _, createdAt, updatedAt, ...cleanJobData } = jobData;

    // Return payment confirmation with job data
    // The client will post the job to Firestore after receiving this confirmation
    res.status(200).json({ 
      success: true,
      paymentIntentId: paymentIntentId,
      jobData: cleanJobData,
      employerId: paymentIntent.metadata.employerId,
      message: 'Payment confirmed'
    });
    
  } catch (error) {
    console.error('Error confirming payment and posting job:', error);
    res.status(500).json({ error: error.message });
  }
}

