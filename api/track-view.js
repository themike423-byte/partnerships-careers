// API endpoint to track job views
// File: api/track-view.js

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
    const { jobId } = req.body;
    
    if (!jobId) {
      return res.status(400).json({ error: 'Missing jobId' });
    }

    const SHEETY_API = 'https://api.sheety.co/4ce55d1d0ad684ea192b042bd2f3b53d/partnershipsCareersDb';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // 1. Update total views in jobs table (sheet1)
    const jobsResponse = await fetch(`${SHEETY_API}/sheet1`);
    const jobsData = await jobsResponse.json();
    const job = jobsData.sheet1.find(j => j.id === parseInt(jobId));
    
    if (job) {
      const updatedViews = (job.totalViews || 0) + 1;
      
      await fetch(`${SHEETY_API}/sheet1/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet1: {
            totalViews: updatedViews
          }
        })
      });
      
      console.log(`✅ Updated job ${jobId} totalViews to ${updatedViews}`);
    }

    // 2. Update analytics table (daily tracking)
    const analyticsResponse = await fetch(`${SHEETY_API}/analytics`);
    const analyticsData = await analyticsResponse.json();
    const todayRecord = analyticsData.analytics?.find(
      a => a.jobId === parseInt(jobId) && a.date === today
    );

    if (todayRecord) {
      // Update existing record for today
      const updatedViews = (todayRecord.views || 0) + 1;
      await fetch(`${SHEETY_API}/analytics/${todayRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analytics: {
            views: updatedViews
          }
        })
      });
      console.log(`✅ Updated analytics record for job ${jobId} on ${today}, views: ${updatedViews}`);
    } else {
      // Create new record for today
      await fetch(`${SHEETY_API}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analytics: {
            jobId: parseInt(jobId),
            date: today,
            views: 1,
            clicks: 0
          }
        })
      });
      console.log(`✅ Created new analytics record for job ${jobId} on ${today}`);
    }

    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('❌ Error tracking view:', error);
    res.status(500).json({ error: error.message });
  }
}
