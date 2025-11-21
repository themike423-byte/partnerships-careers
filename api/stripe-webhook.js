// Vercel Serverless Function to handle Stripe Webhooks
import Stripe from 'stripe';
import admin from 'firebase-admin';
import { getFirestore, initializeFirebaseAdmin } from './firebase-admin-init.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = getFirestore();

export default async function handler(req, res) {
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

  // Handle different event types
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Payment successful for session:', session.id);
        console.log('Metadata:', session.metadata);

        // Handle realtime alert subscriptions
        if (session.metadata && session.metadata.type === 'realtime_alerts' && session.metadata.alertId) {
          try {
            const alertRef = db.collection('jobAlerts').doc(session.metadata.alertId);
            const alertDoc = await alertRef.get();
            
            if (alertDoc.exists) {
              await alertRef.update({
                frequency: 'realtime',
                isActive: true,
                paymentPending: false,
                stripeCustomerId: session.customer,
                updatedAt: new Date().toISOString()
              });
              console.log(`Realtime alert ${session.metadata.alertId} activated after checkout`);
            } else {
              // Create new alert if it doesn't exist
              await alertRef.set({
                email: session.metadata.email,
                frequency: 'realtime',
                subscribedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true,
                paymentPending: false,
                stripeCustomerId: session.customer
              });
              console.log(`Created new realtime alert ${session.metadata.alertId} after checkout`);
            }
          } catch (error) {
            console.error('Error updating alert after checkout:', error);
          }
          return res.status(200).json({ received: true });
        }

        const { jobId, employerId } = session.metadata;

        if (jobId) {
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
        }
        break;

      case 'customer.subscription.created':
        const subscription = event.data.object;
        console.log('Subscription created:', subscription.id);
        
        // Update job alert to confirm subscription is active
        if (subscription.metadata && subscription.metadata.alertId) {
          const alertRef = db.collection('jobAlerts').doc(subscription.metadata.alertId);
          await alertRef.update({
            frequency: 'realtime',
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer,
            isActive: true,
            paymentPending: false,
            updatedAt: new Date().toISOString()
          });
          console.log(`Job alert ${subscription.metadata.alertId} subscription confirmed and activated`);
        }
        break;

      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        console.log('Subscription updated:', updatedSubscription.id);
        
        // Update subscription status in database
        if (updatedSubscription.metadata && updatedSubscription.metadata.alertId) {
          const alertRef = db.collection('jobAlerts').doc(updatedSubscription.metadata.alertId);
          await alertRef.update({
            updatedAt: new Date().toISOString()
          });
          console.log(`Job alert ${updatedSubscription.metadata.alertId} subscription updated`);
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        console.log('Subscription deleted:', deletedSubscription.id);
        
        // Mark alert as inactive and remove subscription info
        if (deletedSubscription.metadata && deletedSubscription.metadata.alertId) {
          const alertRef = db.collection('jobAlerts').doc(deletedSubscription.metadata.alertId);
          await alertRef.update({
            isActive: false,
            frequency: 'weekly', // Downgrade to free tier
            stripeSubscriptionId: null,
            updatedAt: new Date().toISOString()
          });
          console.log(`Job alert ${deletedSubscription.metadata.alertId} subscription cancelled`);
        }
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        console.log('Invoice payment succeeded:', invoice.id);
        
        // Subscription payment confirmed - ensure alert is active
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          if (subscription.metadata && subscription.metadata.alertId) {
            const alertRef = db.collection('jobAlerts').doc(subscription.metadata.alertId);
            await alertRef.update({
              isActive: true,
              updatedAt: new Date().toISOString()
            });
            console.log(`Job alert ${subscription.metadata.alertId} payment confirmed`);
          }
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        console.log('Invoice payment failed:', failedInvoice.id);
        
        // Optionally notify user or mark subscription as needing attention
        if (failedInvoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(failedInvoice.subscription);
          if (subscription.metadata && subscription.metadata.alertId) {
            // You could send an email here or mark the subscription as needing attention
            console.log(`Payment failed for job alert ${subscription.metadata.alertId}`);
          }
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook event:', error);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }

  res.status(200).json({ received: true });
};
