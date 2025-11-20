// Vercel Serverless Function to handle Stripe Webhooks
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Payment successful for session:', session.id);
    console.log('Metadata:', session.metadata);

    const { jobId, employerId } = session.metadata;

    if (jobId) {
      try {
        // Update the job document to mark it as featured
        const jobRef = db.collection('jobs').doc(jobId);
        const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        await jobRef.update({
          isFeatured: true,
          featuredExpiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
          status: 'active'
        });

        // Also keep a record in featuredJobs collection for tracking
        await db.collection('featuredJobs').doc(jobId).set({
          jobId: jobId,
          employerId: employerId,
          featuredAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromDate(expiryDate),
          paid: true,
          amount: session.amount_total,
        });

        console.log(`Job ${jobId} marked as featured`);
      } catch (error) {
        console.error('Error updating Firestore:', error);
        return res.status(500).json({ error: 'Failed to update database' });
      }
    }
  }

  res.status(200).json({ received: true });
};
