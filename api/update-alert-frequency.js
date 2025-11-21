// Vercel Serverless Function to update job alert frequency
import { Resend } from 'resend';
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
const resend = new Resend(process.env.RESEND_API_KEY);
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
    const { email, frequency } = req.body;

    if (!email || !frequency) {
      return res.status(400).json({ error: 'Email and frequency are required' });
    }

    const validFrequencies = ['daily', 'weekly', 'realtime'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({ error: 'Invalid frequency. Must be daily, weekly, or realtime' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find existing alert
    const alertsRef = db.collection('jobAlerts');
    const existingQuery = await alertsRef.where('email', '==', normalizedEmail).limit(1).get();

    if (existingQuery.empty) {
      return res.status(404).json({ error: 'Job alert not found' });
    }

    const alertDoc = existingQuery.docs[0];
    const alertId = alertDoc.id;
    const existingData = alertDoc.data();

    let subscriptionId = existingData.stripeSubscriptionId;
    let customerId = existingData.stripeCustomerId;

    // Handle frequency changes
    if (frequency === 'realtime' && existingData.frequency !== 'realtime') {
      // Upgrade to realtime - create Stripe subscription
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: normalizedEmail,
          metadata: { alertId: alertId }
        });
        customerId = customer.id;
      }

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: process.env.STRIPE_REALTIME_ALERTS_PRICE_ID || 'price_1SW0FACaW2Du37V1Xwv0hG6w'
        }],
        metadata: { alertId: alertId, email: normalizedEmail }
      });

      subscriptionId = subscription.id;
    } else if (frequency !== 'realtime' && existingData.frequency === 'realtime' && subscriptionId) {
      // Downgrade from realtime - cancel subscription
      await stripe.subscriptions.cancel(subscriptionId);
      subscriptionId = null;
    }

    // Update alert in database
    await alertsRef.doc(alertId).update({
      frequency,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      updatedAt: new Date().toISOString()
    });

    // Send confirmation email
    const unsubscribeToken = Buffer.from(`${alertId}:${normalizedEmail}`).toString('base64');
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/unsubscribe?token=${unsubscribeToken}`;

    await resend.emails.send({
      from: 'Partnerships Careers <alerts@partnershipscareers.com>',
      to: normalizedEmail,
      subject: 'Job Alert Preferences Updated',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px; text-align: center;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">Preferences Updated ✅</h2>
                      <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Your job alert frequency has been updated to: <strong>${frequency.charAt(0).toUpperCase() + frequency.slice(1)}</strong>
                      </p>
                      ${frequency === 'realtime' ? 
                        '<p style="margin: 20px 0; color: #4b5563; font-size: 16px;">Your realtime subscription is active. You\'ll receive instant notifications when new jobs are posted.</p>' :
                        '<p style="margin: 20px 0; color: #4b5563; font-size: 16px;">Want instant notifications? <a href="' + (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') + '/alerts?email=' + encodeURIComponent(normalizedEmail) + '" style="color: #4F46E5; text-decoration: none; font-weight: 600;">Upgrade to Realtime Alerts</a> for $5/month.</p>'
                      }
                      <p style="margin: 30px 0 0; color: #6b7280; font-size: 12px;">
                        <a href="${unsubscribeUrl}" style="color: #4F46E5; text-decoration: underline;">Unsubscribe</a> | 
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/alerts?email=${encodeURIComponent(normalizedEmail)}" style="color: #4F46E5; text-decoration: underline;">Manage Preferences</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Alert frequency updated successfully',
      frequency,
      subscriptionId: subscriptionId || null
    });

  } catch (error) {
    console.error('Error updating alert frequency:', error);
    return res.status(500).json({ 
      error: 'Failed to update alert frequency', 
      message: error.message 
    });
  }
}

