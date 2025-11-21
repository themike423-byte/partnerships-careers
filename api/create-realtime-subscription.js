// Vercel Serverless Function to create Stripe Subscription Payment Intent for embedded checkout
import Stripe from 'stripe';
import { getFirestore } from './firebase-admin-init.js';

const db = getFirestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000';

    // Check if alert already exists
    const alertsRef = db.collection('jobAlerts');
    const existingQuery = await alertsRef.where('email', '==', normalizedEmail).limit(1).get();
    
    let alertId;
    if (!existingQuery.empty) {
      alertId = existingQuery.docs[0].id;
    } else {
      // Create alert record first (will be updated after payment)
      const newAlertRef = await alertsRef.add({
        email: normalizedEmail,
        frequency: 'realtime',
        subscribedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: false, // Will be activated after payment
        paymentPending: true
      });
      alertId = newAlertRef.id;
    }

    // Get price ID from environment variable or use default
    const priceId = process.env.STRIPE_REALTIME_ALERTS_PRICE_ID || 'price_1SW0FACaW2Du37V1Xwv0hG6w';
    
    // Validate Stripe key exists
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    
    // Validate price ID format
    if (!priceId.startsWith('price_')) {
      throw new Error(`Invalid Stripe price ID format: ${priceId}`);
    }

    // Create or get customer
    let customerId;
    const existingAlert = !existingQuery.empty ? existingQuery.docs[0].data() : null;
    
    if (existingAlert && existingAlert.stripeCustomerId) {
      customerId = existingAlert.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: normalizedEmail,
        metadata: {
          alertId: alertId,
          email: normalizedEmail
        }
      });
      customerId = customer.id;
      
      // Update alert with customer ID
      if (alertId) {
        await alertsRef.doc(alertId).update({
          stripeCustomerId: customerId,
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Create subscription with incomplete payment (will be confirmed after payment method is attached)
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price: priceId,
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card']
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        type: 'realtime_alerts',
        email: normalizedEmail,
        alertId: alertId
      }
    });

    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice.payment_intent;

    if (!paymentIntent || !paymentIntent.client_secret) {
      throw new Error('Failed to create payment intent for subscription');
    }

    // Update payment intent metadata so webhook can identify it
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        type: 'realtime_alerts',
        email: normalizedEmail,
        alertId: alertId,
        subscriptionId: subscription.id
      }
    });

    return res.status(200).json({ 
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
      customerId: customerId,
      alertId: alertId
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Failed to create subscription', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

