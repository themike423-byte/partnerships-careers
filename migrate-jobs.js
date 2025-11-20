// Migration script to import jobs from Google Sheet to Firestore
// Run this with: node migrate-jobs.js

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Try to load service account key
  let serviceAccount;
  try {
    const keyPath = join(__dirname, 'serviceAccountKey.json');
    const keyData = readFileSync(keyPath, 'utf8');
    serviceAccount = JSON.parse(keyData);
  } catch (error) {
    console.error('❌ Error: Could not find serviceAccountKey.json file!');
    console.error('   Please make sure the file is in the same folder as this script.');
    console.error('   The file should be named: serviceAccountKey.json');
    console.error('   Error details:', error.message);
    process.exit(1);
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Category mapping function
function mapCategory(oldCategory) {
  const mapping = {
    'Channel & Reseller': 'Channel & Reseller',
    'Channel & Alliances': 'Channel & Reseller',
    'Partner Analytics': 'Technology & ISV',
    'Partner Services': 'Agency & Services',
    'Partner Marketing': 'Strategic Alliances',
    'Partner Management': 'Channel & Reseller',
    'Partner Success': 'Agency & Services',
    'ISV & Marketplace': 'Ecosystem & Marketplace',
    'Strategic Alliances with Hyperscalers/SIs': 'Strategic Alliances',
    'Product & OEM Partnerships': 'Distribution & OEM',
    'Corporate Development & Venture Partnerships': 'Strategic Alliances',
    'Ecosystem & Platform': 'Ecosystem & Marketplace'
  };
  return mapping[oldCategory] || 'Channel & Reseller';
}

// Region mapping function (based on location)
function mapRegion(location) {
  const loc = (location || '').toLowerCase();
  if (loc.includes('spain') || loc.includes('europe') || loc.includes('emea')) {
    return 'EMEA';
  }
  if (loc.includes('nyc') || loc.includes('sf') || loc.includes('united states') || loc.includes('usa') || loc.includes('us') || loc.includes('canada')) {
    return 'NAmer';
  }
  if (loc.includes('asia') || loc.includes('apac') || loc.includes('australia')) {
    return 'APAC';
  }
  if (loc.includes('latin') || loc.includes('latam') || loc.includes('mexico') || loc.includes('brazil')) {
    return 'LATAM';
  }
  if (loc.includes('remote') || loc.includes('global') || loc.includes('unspecified')) {
    return 'Global';
  }
  // Default based on common patterns
  return 'NAmer'; // Default to NAmer if unclear
}

// Job data from your Google Sheet
// I'll create this from the data you shared
const jobsData = [
  {
    id: 1,
    title: "Director of Channel Partnerships",
    company: "Reality Defender",
    location: "NYC",
    type: "Full-Time",
    salaryRange: "Unspecified",
    level: "Director",
    category: "Channel & Reseller",
    description: "test text for job description",
    postedDate: "11/13/2025",
    isFeatured: true,
    featuredExpiryDate: "12/13/2025", // 30 days from posted date
    totalViews: 0,
    totalClicks: 0,
    status: "active",
    employerId: "emp_01",
    link: "https://www.realitydefender.com/careers/open-roles/director-of-channel-partnerships?id=d7f6476c-1c91-485a-b871-062e7f74552f"
  },
  {
    id: 2,
    title: "Sr. Ecosystems Strategic Analytics Manager",
    company: "PaloAlto Networks",
    location: "Unspecified",
    type: "Full-Time",
    salaryRange: "Unspecified",
    level: "Senior Manager",
    category: "Technology & ISV",
    description: "",
    postedDate: "11/14/2025",
    isFeatured: false,
    totalViews: 0,
    totalClicks: 0,
    status: "active",
    employerId: "emp_02",
    link: "https://jobs.smartrecruiters.com/PaloAltoNetworks2/744000093307916-sr-ecosystems-strategic-analytics-manager?trid=463ac537-35c8-4256-8fe4-47ea285de0a6"
  },
  {
    id: 3,
    title: "Principal Program Manager, Partner Services",
    company: "Zscaler",
    location: "Unspecified",
    type: "Full-Time",
    salaryRange: "Unspecified",
    level: "Principal",
    category: "Agency & Services",
    description: "",
    postedDate: "11/14/2025",
    isFeatured: false,
    totalViews: 0,
    totalClicks: 0,
    status: "active",
    employerId: "emp_03",
    link: "https://job-boards.greenhouse.io/zscaler/jobs/4934948007"
  },
  {
    id: 4,
    title: "Partner Marketing Manager, AWS",
    company: "MongoDB",
    location: "Unspecified",
    type: "Full-Time",
    salaryRange: "Unspecified",
    level: "Manager",
    category: "Strategic Alliances",
    description: "",
    postedDate: "11/14/2025",
    isFeatured: false,
    totalViews: 0,
    totalClicks: 0,
    status: "active",
    employerId: "emp_04",
    link: "https://www.mongodb.com/careers/jobs/7388978"
  },
  {
    id: 5,
    title: "ISV & Marketplace Solution Manager",
    company: "TD SYNNEX Spain",
    location: "Spain",
    type: "Full-Time",
    salaryRange: "Unspecified",
    level: "Manager",
    category: "Ecosystem & Marketplace",
    description: "",
    postedDate: "11/14/2025",
    isFeatured: false,
    totalViews: 0,
    totalClicks: 0,
    status: "active",
    employerId: "emp_05",
    link: "https://careers.tdsynnex.com/us/en/job/TSQTSBUSR43965EXTERNALENUS/ISV-Marketplace-Solution-Manager?utm_source=linkedin&utm_medium=phenom-feeds"
  },
  {
    id: 6,
    title: "Partner Manager, Shopify",
    company: "Klaviyo",
    location: "Unspecified",
    type: "Full-Time",
    salaryRange: "Unspecified",
    level: "Manager",
    category: "Channel & Reseller",
    description: "",
    postedDate: "11/14/2025",
    isFeatured: false,
    totalViews: 0,
    totalClicks: 0,
    status: "active",
    employerId: "emp_06",
    link: "https://www.klaviyo.com/careers/jobs/7525698003/?gh_jid=7525698003"
  },
  {
    id: 7,
    title: "Channel and Alliances Director",
    company: "Cloudinary",
    location: "Unspecified",
    type: "Full-Time",
    salaryRange: "Unspecified",
    level: "Director",
    category: "Channel & Reseller",
    description: "",
    postedDate: "11/14/2025",
    isFeatured: false,
    totalViews: 0,
    totalClicks: 0,
    status: "active",
    employerId: "emp_07",
    link: "https://www.linkedin.com/jobs/view/4321199686/?refId=Cnqt2OkWRxCtdA8xGvOqhg%3D%3D&trackingId=Cnqt2OkWRxCtdA8xGvOqhg%3D%3D"
  },
  {
    id: 8,
    title: "Sr. Partner Marketing Manager",
    company: "SentinelOne",
    location: "Unspecified",
    type: "Full-Time",
    salaryRange: "Unspecified",
    level: "Senior Manager",
    category: "Strategic Alliances",
    description: "",
    postedDate: "11/14/2025",
    isFeatured: false,
    totalViews: 0,
    totalClicks: 0,
    status: "active",
    employerId: "emp_08",
    link: "https://www.sentinelone.com/jobs/?gh_jid=7525461003"
  },
  {
    id: 9,
    title: "Partner Manager, Scaled",
    company: "Figma",
    location: "Unspecified",
    type: "Full-Time",
    salaryRange: "Unspecified",
    level: "Manager",
    category: "Channel & Reseller",
    description: "",
    postedDate: "11/14/2025",
    isFeatured: false,
    totalViews: 0,
    totalClicks: 0,
    status: "active",
    employerId: "emp_09",
    link: "https://job-boards.greenhouse.io/figma/jobs/5705600004"
  },
  {
    id: 10,
    title: "Senior Director, Partner Success",
    company: "evermore",
    location: "Unspecified",
    type: "Full-Time",
    salaryRange: "Unspecified",
    level: "Senior Director",
    category: "Agency & Services",
    description: "",
    postedDate: "11/14/2025",
    isFeatured: true,
    featuredExpiryDate: "12/14/2025",
    totalViews: 0,
    totalClicks: 0,
    status: "active",
    employerId: "emp_10",
    link: "https://job-boards.greenhouse.io/evermore/jobs/4617453006"
  },
  {
    id: 11,
    title: "Test - VP of Alliances",
    company: "Admin PartnershipsCareers2",
    location: "SF",
    type: "Full-Time",
    salaryRange: "Unspecified",
    level: "VP",
    category: "Strategic Alliances",
    description: "doesnt matter- this is a test",
    postedDate: "11/17/2025",
    isFeatured: true,
    featuredExpiryDate: "12/17/2025",
    totalViews: 0,
    totalClicks: 0,
    status: "active",
    employerId: "6rbRBrlObCY2sJWzpW4zhMBA3Fo1",
    link: "https://www.scalewithstrive.com/saas-job-descriptions/vp-of-partnerships/"
  }
];

// Helper function to convert date string to ISO date
function convertDate(dateString) {
  if (!dateString) return new Date().toISOString();
  
  // Handle MM/DD/YYYY format
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0]) - 1;
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    return new Date(year, month, day).toISOString();
  }
  
  return new Date(dateString).toISOString();
}

// Helper function to convert expiry date
function convertExpiryDate(dateString, postedDate) {
  if (dateString && !isNaN(dateString)) {
    // If it's just a number (days), calculate from posted date
    const posted = convertDate(postedDate);
    const expiry = new Date(posted);
    expiry.setDate(expiry.getDate() + parseInt(dateString));
    return expiry.toISOString();
  }
  if (dateString) {
    return convertDate(dateString);
  }
  // Default: 30 days from posted date
  const posted = convertDate(postedDate);
  const expiry = new Date(posted);
  expiry.setDate(expiry.getDate() + 30);
  return expiry.toISOString();
}

async function migrateJobs() {
  console.log('🚀 Starting job migration to Firestore...\n');
  
  const jobsRef = db.collection('jobs');
  let successCount = 0;
  let errorCount = 0;
  
  for (const job of jobsData) {
    try {
      // Convert the job data to Firestore format
      const firestoreJob = {
        title: job.title,
        company: job.company,
        location: job.location || 'Unspecified',
        type: job.type || 'Full-Time',
        salaryRange: job.salaryRange || 'Unspecified',
        level: job.level,
        category: mapCategory(job.category), // Map old category to new
        region: job.region || mapRegion(job.location), // Use provided region or map from location
        description: job.description || '',
        postedDate: convertDate(job.postedDate),
        isFeatured: job.isFeatured === true || job.isFeatured === 'TRUE' || job.isFeatured === 'true',
        learnMoreClicks: parseInt(job.learnMoreClicks) || 0,
        totalClicks: parseInt(job.totalClicks) || 0,
        status: job.status || 'active',
        employerId: job.employerId || 'unknown',
        link: job.link,
        createdAt: convertDate(job.postedDate)
      };
      
      // Add featured expiry date if featured
      if (firestoreJob.isFeatured) {
        firestoreJob.featuredExpiryDate = admin.firestore.Timestamp.fromDate(
          new Date(convertExpiryDate(job.featuredExpiryDate, job.postedDate))
        );
      }
      
      // Add the job to Firestore
      await jobsRef.add(firestoreJob);
      
      console.log(`✅ Migrated: ${job.title} at ${job.company}`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Error migrating job ${job.id} (${job.title}):`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n✨ Migration complete!`);
  console.log(`   ✅ Successfully migrated: ${successCount} jobs`);
  console.log(`   ❌ Errors: ${errorCount} jobs`);
  console.log(`\n🎉 All done! Your jobs are now in Firestore.`);
  
  process.exit(0);
}

// Run the migration
migrateJobs().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

