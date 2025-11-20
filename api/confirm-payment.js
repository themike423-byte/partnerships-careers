// Vercel Serverless Function to confirm payment and post job to Firestore
import Stripe from 'stripe';

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

    // Retrieve the payment intent to verify it was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Return payment confirmation with job data
    // The client will post the job to Firestore after receiving this confirmation
    res.status(200).json({ 
      success: true,
      paymentIntentId: paymentIntentId,
      jobData: JSON.parse(paymentIntent.metadata.jobData),
      employerId: paymentIntent.metadata.employerId,
      message: 'Payment confirmed'
    });
    
  } catch (error) {
    console.error('Error confirming payment and posting job:', error);
    res.status(500).json({ error: error.message });
  }
}

