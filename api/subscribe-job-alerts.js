// Vercel Serverless Function to handle job alert subscriptions
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

    // For realtime, user must go through checkout - don't process here
    if (frequency === 'realtime') {
      return res.status(200).json({ 
        success: true,
        requiresCheckout: true,
        message: 'Please complete checkout to activate realtime alerts'
      });
    }

    // Check if user already exists (for daily/weekly only)
    const alertsRef = db.collection('jobAlerts');
    const existingQuery = await alertsRef.where('email', '==', normalizedEmail).limit(1).get();

    let alertId;

    if (!existingQuery.empty) {
      // Update existing alert (for daily/weekly only)
      alertId = existingQuery.docs[0].id;
      const existingData = existingQuery.docs[0].data();
      
      // If switching away from realtime, cancel subscription
      if (existingData.frequency === 'realtime' && existingData.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(existingData.stripeSubscriptionId);
        } catch (error) {
          console.error('Error canceling subscription:', error);
        }
      }

      await alertsRef.doc(alertId).update({
        frequency,
        stripeSubscriptionId: null, // Clear subscription for daily/weekly
        updatedAt: new Date().toISOString(),
        isActive: true
      });
    } else {
      // Create new alert (for daily/weekly only)
      const alertData = {
        email: normalizedEmail,
        frequency,
        subscribedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };

      const newAlertRef = await alertsRef.add(alertData);
      alertId = newAlertRef.id;
    }

    // Generate unsubscribe token
    const unsubscribeToken = Buffer.from(`${alertId}:${normalizedEmail}`).toString('base64');
    const unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/unsubscribe?token=${unsubscribeToken}`;

    // Send welcome email
    const emailSubject = frequency === 'realtime' 
      ? 'Welcome to Partnerships Careers - Realtime Job Alerts! 🚀'
      : `Welcome to Partnerships Careers - ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Job Alerts!`;

    await resend.emails.send({
      from: 'Partnerships Careers <alerts@partnershipscareers.com>',
      to: normalizedEmail,
      subject: emailSubject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Partnerships Careers</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px; text-align: center;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                      <div style="width: 52px; height: 52px; background-color: #4F46E5; border-radius: 6px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                        <span style="color: white; font-size: 22px; font-weight: bold;">PC</span>
                      </div>
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Partnerships Careers</h1>
                      <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 14px;">Find Your Next Partnership Role</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">Welcome! 🎉</h2>
                      <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                        Thank you for signing up for job alerts from Partnerships Careers! We're excited to help you find your next partnership role.
                      </p>
                      
                      <div style="background-color: #f9fafb; border-left: 4px solid #4F46E5; padding: 20px; margin: 30px 0; border-radius: 4px;">
                        <p style="margin: 0 0 10px; color: #1f2937; font-size: 16px; font-weight: 600;">Your Alert Frequency:</p>
                        <p style="margin: 0; color: #4b5563; font-size: 16px;">
                          ${frequency === 'realtime' ? '⚡ <strong>Realtime</strong> - Instant notifications when new jobs are posted ($5/month)' : 
                            frequency === 'daily' ? '📅 <strong>Daily</strong> - A digest of new jobs every day' : 
                            '📆 <strong>Weekly</strong> - A weekly summary of new opportunities'}
                        </p>
                      </div>

                      ${frequency === 'realtime' ? `
                        <p style="margin: 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                          Your subscription is active and you'll receive instant notifications whenever new partnership jobs are posted. You can manage your subscription or change your alert frequency at any time.
                        </p>
                      ` : `
                        <p style="margin: 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                          You'll receive ${frequency === 'daily' ? 'a daily digest' : 'a weekly summary'} of new partnership job opportunities. Want instant notifications? <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/alerts?email=${encodeURIComponent(normalizedEmail)}" style="color: #4F46E5; text-decoration: none; font-weight: 600;">Upgrade to Realtime Alerts</a> for just $5/month.
                        </p>
                      `}

                      <div style="margin: 30px 0; padding: 20px; background-color: #fef3c7; border-radius: 8px;">
                        <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; font-weight: 600;">💡 What to Expect:</p>
                        <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.8;">
                          <li>Curated partnership job opportunities</li>
                          <li>Jobs from top companies in the partnership ecosystem</li>
                          <li>Roles across all levels: Manager, Director, VP, and C-Suite</li>
                          <li>Multiple partnership categories: Channel, Technology, Strategic Alliances, and more</li>
                        </ul>
                      </div>

                      <div style="text-align: center; margin: 40px 0 30px;">
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Browse All Jobs</a>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0 0 15px; color: #6b7280; font-size: 12px; line-height: 1.6;">
                        You're receiving this email because you signed up for job alerts from Partnerships Careers.<br>
                        <a href="${unsubscribeUrl}" style="color: #4F46E5; text-decoration: underline;">Unsubscribe</a> | 
                        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/alerts?email=${encodeURIComponent(normalizedEmail)}" style="color: #4F46E5; text-decoration: underline;">Manage Preferences</a>
                      </p>
                      <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                        Partnerships Careers © ${new Date().getFullYear()} | All rights reserved
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
      message: 'Subscription created successfully',
      alertId,
      subscriptionId: subscriptionId || null
    });

  } catch (error) {
    console.error('Error subscribing to job alerts:', error);
    return res.status(500).json({ 
      error: 'Failed to subscribe to job alerts', 
      message: error.message 
    });
  }
}

