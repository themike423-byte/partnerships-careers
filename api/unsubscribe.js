// Vercel Serverless Function to handle unsubscribes
const admin = require('firebase-admin');
const Stripe = require('stripe');

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

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    // Handle unsubscribe via token
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Unsubscribe - Partnerships Careers</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f3f4f6; }
            .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 500px; text-align: center; }
            h1 { color: #1f2937; margin-bottom: 20px; }
            p { color: #4b5563; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Invalid Unsubscribe Link</h1>
            <p>The unsubscribe link is invalid or has expired. Please contact support if you need assistance.</p>
          </div>
        </body>
        </html>
      `);
    }

    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [alertId, email] = decoded.split(':');

      if (!alertId || !email) {
        throw new Error('Invalid token format');
      }

      const alertRef = db.collection('jobAlerts').doc(alertId);
      const alertDoc = await alertRef.get();

      if (!alertDoc.exists || alertDoc.data().email !== email.toLowerCase()) {
        throw new Error('Alert not found');
      }

      const alertData = alertDoc.data();

      // Cancel Stripe subscription if exists
      if (alertData.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(alertData.stripeSubscriptionId);
        } catch (stripeError) {
          console.error('Error canceling Stripe subscription:', stripeError);
        }
      }

      // Update alert to inactive
      await alertRef.update({
        isActive: false,
        unsubscribedAt: new Date().toISOString()
      });

      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Unsubscribed - Partnerships Careers</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f3f4f6; }
            .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 500px; text-align: center; }
            h1 { color: #1f2937; margin-bottom: 20px; }
            p { color: #4b5563; line-height: 1.6; margin-bottom: 20px; }
            .success { color: #059669; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Successfully Unsubscribed</h1>
            <p class="success">✓ You have been unsubscribed from job alerts.</p>
            <p>You will no longer receive job alert emails from Partnerships Careers. If you change your mind, you can always sign up again.</p>
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}" style="color: #4F46E5; text-decoration: none;">Return to Partnerships Careers</a>
            </p>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Error processing unsubscribe:', error);
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Error - Partnerships Careers</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f3f4f6; }
            .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 500px; text-align: center; }
            h1 { color: #dc2626; margin-bottom: 20px; }
            p { color: #4b5563; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Error</h1>
            <p>There was an error processing your unsubscribe request. Please try again or contact support.</p>
          </div>
        </body>
        </html>
      `);
    }
  }

  if (req.method === 'POST') {
    // Handle programmatic unsubscribe
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const alertsRef = db.collection('jobAlerts');
      const existingQuery = await alertsRef.where('email', '==', normalizedEmail).get();

      if (existingQuery.empty) {
        return res.status(404).json({ error: 'Job alert not found' });
      }

      const alertDoc = existingQuery.docs[0];
      const alertData = alertDoc.data();

      // Cancel Stripe subscription if exists
      if (alertData.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(alertData.stripeSubscriptionId);
        } catch (stripeError) {
          console.error('Error canceling Stripe subscription:', stripeError);
        }
      }

      // Update alert to inactive
      await alertDoc.ref.update({
        isActive: false,
        unsubscribedAt: new Date().toISOString()
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Successfully unsubscribed' 
      });
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return res.status(500).json({ 
        error: 'Failed to unsubscribe', 
        message: error.message 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

