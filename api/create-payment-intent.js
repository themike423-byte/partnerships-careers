// Vercel Serverless Function to create Stripe Payment Intent for embedded payment
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
    const { jobData, employerId } = req.body;
    
    if (!jobData || !employerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get price from environment (default to $99 = 9900 cents)
    const amount = process.env.STRIPE_AMOUNT ? parseInt(process.env.STRIPE_AMOUNT) : 9900;

    // Create Payment Intent with job data in metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      metadata: {
        type: 'new_job',
        employerId: employerId,
        jobData: JSON.stringify(jobData), // Store entire job data in metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.status(200).json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
    
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
}

