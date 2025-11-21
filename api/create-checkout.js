// Vercel Serverless Function to create Stripe Checkout Session
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper function to check if email is whitelisted admin
function isWhitelistedAdmin(email) {
  if (!email) return false;
  const emailLower = email.toLowerCase();
  // Check for specific email
  if (emailLower === 'themike423@gmail.com') return true;
  // Check for @consultant.com domain
  if (emailLower.endsWith('@consultant.com')) return true;
  return false;
}

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
    const { type, jobId, jobTitle, employerId, company, email } = req.body;
    
    console.log('Received request:', { type, jobId, jobTitle, employerId, company, email });

    if (!type) {
      return res.status(400).json({ error: 'Missing type parameter' });
    }

    if (!employerId) {
      return res.status(400).json({ error: 'Missing employerId' });
    }

    // Check if user is whitelisted admin
    const isAdmin = email && isWhitelistedAdmin(email);
    if (isAdmin) {
      console.log('🔐 Whitelisted admin detected:', email);
    }

    let session;
    const baseUrl = process.env.SITE_URL || 'https://partnerships-careers.vercel.app';

    if (type === 'new') {
      // NEW: Payment for posting a new featured job
      console.log('Creating checkout session for NEW job posting');
      
      // Allow whitelisted admins to bypass company name requirement
      if (!company && !isAdmin) {
        return res.status(400).json({ error: 'Missing company name' });
      }
      
      // Use a default company name for admins if not provided
      const companyName = company || (isAdmin ? 'Admin Test Company' : '');
      
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}?payment=success&type=new`,
        cancel_url: `${baseUrl}?payment=cancelled`,
        metadata: {
          type: 'new_job',
          employerId: employerId,
          company: companyName,
          isAdmin: isAdmin ? 'true' : 'false',
          adminEmail: isAdmin ? email : undefined,
        },
      });
      
      console.log('New job checkout session created:', session.id);
      
    } else if (type === 'promote') {
      // EXISTING: Payment for promoting an existing job
      console.log('Creating checkout session for job PROMOTION');
      
      if (!jobId || !jobTitle) {
        return res.status(400).json({ error: 'Missing jobId or jobTitle' });
      }
      
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}?payment=success&type=promote`,
        cancel_url: `${baseUrl}?payment=cancelled`,
        metadata: {
          type: 'promote',
          jobId: jobId,
          jobTitle: jobTitle,
          employerId: employerId,
        },
        client_reference_id: jobId,
      });
      
      console.log('Job promotion checkout session created:', session.id);
      
    } else {
      return res.status(400).json({ error: 'Invalid type parameter. Must be "new" or "promote"' });
    }

    res.status(200).json({ sessionId: session.id, url: session.url });
    
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
}
