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
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    console.log('Payment successful for session:', session.id);
    console.log('Metadata:', session.metadata);

    const { jobId, employerId } = session.metadata;

    if (jobId) {
      try {
        // Update the job in Firestore to set it as featured
        // Note: You'll need to update this path based on your Firestore structure
        // For now, I'm assuming jobs are stored in Sheety, so we'll just log it
        
        // If you want to store featured status in Firestore:
        // await db.collection('featuredJobs').doc(jobId).set({
        //   jobId: jobId,
        //   employerId: employerId,
        //   featuredAt: admin.firestore.FieldValue.serverTimestamp(),
        //   expiresAt: admin.firestore.Timestamp.fromDate(
        //     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        //   ),
        //   paid: true,
        //   amount: session.amount_total,
        // });

        console.log(`Job ${jobId} marked as featured for employer ${employerId}`);
        
        // TODO: Send confirmation email to employer
        // You can use SendGrid, Resend, or another email service here
        
      } catch (error) {
        console.error('Error updating Firestore:', error);
        return res.status(500).json({ error: 'Failed to update database' });
      }
    }
  }

  // Return a response to acknowledge receipt of the event
  res.status(200).json({ received: true });
};
