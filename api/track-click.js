// API endpoint to track Apply Now clicks
// File: api/track-click.js

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

module.exports = async function handler(req, res) {
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
    const { jobId } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Missing jobId' });
    }

    // Update total clicks in Firestore
    const jobRef = db.collection('jobs').doc(jobId);
    const jobDoc = await jobRef.get();
    
    if (jobDoc.exists) {
      const currentClicks = jobDoc.data().totalClicks || 0;
      await jobRef.update({
        totalClicks: currentClicks + 1
      });
      console.log(`✅ Updated job ${jobId} totalClicks to ${currentClicks + 1}`);
    } else {
      console.log(`⚠️ Job ${jobId} not found in Firestore`);
    }

    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('❌ Error tracking click:', error);
    res.status(500).json({ error: error.message });
  }
}
