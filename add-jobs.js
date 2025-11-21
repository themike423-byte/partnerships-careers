// Script to add 20 realistic partnership jobs to Firestore
// Run with: node add-jobs.js
// Make sure you have serviceAccountKey.json in the same directory

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

// 20 realistic partnership jobs
const jobsData = [
    // Existing companies (multiple listings)
    {
        title: "Senior Partner Manager, Cloud Infrastructure",
        company: "Cloudinary",
        location: "San Francisco, CA",
        type: "Full-Time",
        salaryRange: "$140,000 - $180,000",
        level: "Senior Manager",
        category: "Technology & ISV",
        region: "NAmer",
        description: "Lead strategic partnerships with cloud infrastructure providers and ISV partners. Drive co-marketing initiatives and joint go-to-market strategies.",
        link: "https://careers.cloudinary.com/jobs/partner-manager-cloud",
        isFeatured: true,
        isRemote: true,
        hasEquity: true,
        hasVisa: false,
        companyStage: "Series D",
        companySize: "201-500",
        status: "active",
        postedDate: new Date().toISOString(),
        featuredExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Partner Marketing Manager",
        company: "Cloudinary",
        location: "Remote",
        type: "Full-Time",
        salaryRange: "$110,000 - $145,000",
        level: "Manager",
        category: "Strategic Alliances",
        region: "Global",
        description: "Develop and execute partner marketing programs, co-marketing campaigns, and joint content initiatives with strategic technology partners.",
        link: "https://careers.cloudinary.com/jobs/partner-marketing-manager",
        isFeatured: false,
        isRemote: true,
        hasEquity: true,
        hasVisa: false,
        companyStage: "Series D",
        companySize: "201-500",
        status: "active",
        postedDate: new Date().toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Director of Strategic Partnerships",
        company: "Palo Alto Networks",
        location: "Santa Clara, CA",
        type: "Full-Time",
        salaryRange: "$180,000 - $220,000",
        level: "Director",
        category: "Strategic Alliances",
        region: "NAmer",
        description: "Lead strategic partnerships with hyperscalers, system integrators, and enterprise technology providers. Drive revenue through partner channels.",
        link: "https://jobs.smartrecruiters.com/PaloAltoNetworks2/director-strategic-partnerships",
        isFeatured: true,
        isRemote: false,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Public",
        companySize: "5000+",
        status: "active",
        postedDate: new Date().toISOString(),
        featuredExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Partner Success Manager",
        company: "Palo Alto Networks",
        location: "Remote - US",
        type: "Full-Time",
        salaryRange: "$120,000 - $160,000",
        level: "Manager",
        category: "Agency & Services",
        region: "NAmer",
        description: "Ensure partner success through enablement, training, and ongoing support. Drive partner satisfaction and revenue growth.",
        link: "https://jobs.smartrecruiters.com/PaloAltoNetworks2/partner-success-manager",
        isFeatured: false,
        isRemote: true,
        hasEquity: true,
        hasVisa: false,
        companyStage: "Public",
        companySize: "5000+",
        status: "active",
        postedDate: new Date().toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Senior Channel Partner Manager",
        company: "Zscaler",
        location: "San Jose, CA",
        type: "Full-Time",
        salaryRange: "$150,000 - $190,000",
        level: "Senior Manager",
        category: "Channel & Reseller",
        region: "NAmer",
        description: "Manage relationships with key channel partners and resellers. Develop partner enablement programs and drive channel revenue.",
        link: "https://job-boards.greenhouse.io/zscaler/jobs/senior-channel-partner-manager",
        isFeatured: true,
        isRemote: false,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Public",
        companySize: "2000-5000",
        status: "active",
        postedDate: new Date().toISOString(),
        featuredExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    // New companies
    {
        title: "Head of Partner Ecosystem",
        company: "Stripe",
        location: "San Francisco, CA",
        type: "Full-Time",
        salaryRange: "$200,000 - $250,000",
        level: "Director",
        category: "Ecosystem & Marketplace",
        region: "NAmer",
        description: "Build and scale Stripe's partner ecosystem, including ISV integrations, marketplace partnerships, and strategic alliances.",
        link: "https://stripe.com/jobs/listing/head-partner-ecosystem",
        isFeatured: true,
        isRemote: false,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Series H",
        companySize: "2000-5000",
        status: "active",
        postedDate: new Date().toISOString(),
        featuredExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Partner Development Manager",
        company: "Databricks",
        location: "San Francisco, CA",
        type: "Full-Time",
        salaryRange: "$130,000 - $170,000",
        level: "Manager",
        category: "Technology & ISV",
        region: "NAmer",
        description: "Develop strategic partnerships with data platform providers, cloud vendors, and technology integrators.",
        link: "https://www.databricks.com/company/careers/open-positions/partner-development-manager",
        isFeatured: false,
        isRemote: true,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Series I",
        companySize: "2000-5000",
        status: "active",
        postedDate: new Date().toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Strategic Alliances Director",
        company: "Snowflake",
        location: "San Mateo, CA",
        type: "Full-Time",
        salaryRange: "$190,000 - $240,000",
        level: "Director",
        category: "Strategic Alliances",
        region: "NAmer",
        description: "Lead strategic alliances with hyperscalers (AWS, Azure, GCP) and major system integrators. Drive joint go-to-market initiatives.",
        link: "https://careers.snowflake.com/us/en/job/strategic-alliances-director",
        isFeatured: true,
        isRemote: false,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Public",
        companySize: "5000+",
        status: "active",
        postedDate: new Date().toISOString(),
        featuredExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Partner Marketing Lead",
        company: "MongoDB",
        location: "New York, NY",
        type: "Full-Time",
        salaryRange: "$125,000 - $165,000",
        level: "Manager",
        category: "Strategic Alliances",
        region: "NAmer",
        description: "Lead partner marketing initiatives including co-marketing campaigns, joint webinars, and partner content development.",
        link: "https://www.mongodb.com/careers/jobs/partner-marketing-lead",
        isFeatured: false,
        isRemote: true,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Public",
        companySize: "2000-5000",
        status: "active",
        postedDate: new Date().toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Channel Sales Manager",
        company: "Okta",
        location: "San Francisco, CA",
        type: "Full-Time",
        salaryRange: "$140,000 - $180,000",
        level: "Manager",
        category: "Channel & Reseller",
        region: "NAmer",
        description: "Manage channel partner relationships and drive revenue through reseller and distributor channels.",
        link: "https://www.okta.com/company/careers/channel-sales-manager",
        isFeatured: false,
        isRemote: false,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Public",
        companySize: "2000-5000",
        status: "active",
        postedDate: new Date().toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Partner Success Manager, EMEA",
        company: "Twilio",
        location: "London, UK",
        type: "Full-Time",
        salaryRange: "£70,000 - £90,000",
        level: "Manager",
        category: "Agency & Services",
        region: "EMEA",
        description: "Support partner success across EMEA region. Enable partners through training, resources, and ongoing support.",
        link: "https://www.twilio.com/company/jobs/partner-success-manager-emea",
        isFeatured: false,
        isRemote: true,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Public",
        companySize: "2000-5000",
        status: "active",
        postedDate: new Date().toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Director of ISV Partnerships",
        company: "Auth0",
        location: "Bellevue, WA",
        type: "Full-Time",
        salaryRange: "$175,000 - $215,000",
        level: "Director",
        category: "Technology & ISV",
        region: "NAmer",
        description: "Build and manage strategic ISV partnerships. Drive integration initiatives and joint product development.",
        link: "https://auth0.com/careers/director-isv-partnerships",
        isFeatured: true,
        isRemote: true,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Acquired",
        companySize: "1000-2000",
        status: "active",
        postedDate: new Date().toISOString(),
        featuredExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Partner Enablement Manager",
        company: "Vercel",
        location: "San Francisco, CA",
        type: "Full-Time",
        salaryRange: "$115,000 - $150,000",
        level: "Manager",
        category: "Agency & Services",
        region: "NAmer",
        description: "Enable partners through training, certification programs, and technical resources. Drive partner readiness and success.",
        link: "https://vercel.com/careers/partner-enablement-manager",
        isFeatured: false,
        isRemote: true,
        hasEquity: true,
        hasVisa: false,
        companyStage: "Series D",
        companySize: "201-500",
        status: "active",
        postedDate: new Date().toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Strategic Partner Manager, APAC",
        company: "Shopify",
        location: "Singapore",
        type: "Full-Time",
        salaryRange: "S$120,000 - S$160,000",
        level: "Manager",
        category: "Strategic Alliances",
        region: "APAC",
        description: "Develop strategic partnerships across APAC region. Work with payment providers, logistics partners, and technology integrators.",
        link: "https://www.shopify.com/careers/strategic-partner-manager-apac",
        isFeatured: false,
        isRemote: false,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Public",
        companySize: "5000+",
        status: "active",
        postedDate: new Date().toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Head of Channel Partnerships",
        company: "Notion",
        location: "San Francisco, CA",
        type: "Full-Time",
        salaryRange: "$180,000 - $220,000",
        level: "Director",
        category: "Channel & Reseller",
        region: "NAmer",
        description: "Build and scale Notion's channel partner program. Develop relationships with resellers, distributors, and system integrators.",
        link: "https://www.notion.so/careers/head-channel-partnerships",
        isFeatured: true,
        isRemote: false,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Series C",
        companySize: "501-1000",
        status: "active",
        postedDate: new Date().toISOString(),
        featuredExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Partner Marketing Specialist",
        company: "Figma",
        location: "San Francisco, CA",
        type: "Full-Time",
        salaryRange: "$100,000 - $135,000",
        level: "Individual Contributor",
        category: "Strategic Alliances",
        region: "NAmer",
        description: "Execute partner marketing campaigns, co-marketing initiatives, and joint content creation with design tool partners.",
        link: "https://www.figma.com/careers/partner-marketing-specialist",
        isFeatured: false,
        isRemote: true,
        hasEquity: true,
        hasVisa: false,
        companyStage: "Series E",
        companySize: "501-1000",
        status: "active",
        postedDate: new Date().toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Senior Partner Manager, Cloud Providers",
        company: "Elastic",
        location: "Mountain View, CA",
        type: "Full-Time",
        salaryRange: "$155,000 - $195,000",
        level: "Senior Manager",
        category: "Technology & ISV",
        region: "NAmer",
        description: "Manage strategic partnerships with AWS, Azure, and GCP. Drive marketplace listings and joint go-to-market initiatives.",
        link: "https://www.elastic.co/careers/senior-partner-manager-cloud",
        isFeatured: false,
        isRemote: true,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Public",
        companySize: "2000-5000",
        status: "active",
        postedDate: new Date().toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Partner Operations Manager",
        company: "GitHub",
        location: "San Francisco, CA",
        type: "Full-Time",
        salaryRange: "$120,000 - $160,000",
        level: "Manager",
        category: "Agency & Services",
        region: "NAmer",
        description: "Optimize partner operations, manage partner programs, and ensure smooth partner onboarding and lifecycle management.",
        link: "https://github.com/careers/partner-operations-manager",
        isFeatured: false,
        isRemote: true,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Acquired",
        companySize: "2000-5000",
        status: "active",
        postedDate: new Date().toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Director of Ecosystem Partnerships",
        company: "Confluent",
        location: "Mountain View, CA",
        type: "Full-Time",
        salaryRange: "$185,000 - $230,000",
        level: "Director",
        category: "Ecosystem & Marketplace",
        region: "NAmer",
        description: "Build Confluent's partner ecosystem including ISV integrations, marketplace partnerships, and strategic technology alliances.",
        link: "https://www.confluent.io/careers/director-ecosystem-partnerships",
        isFeatured: true,
        isRemote: false,
        hasEquity: true,
        hasVisa: true,
        companyStage: "Public",
        companySize: "1000-2000",
        status: "active",
        postedDate: new Date().toISOString(),
        featuredExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    },
    {
        title: "Partner Development Representative",
        company: "Segment",
        location: "San Francisco, CA",
        type: "Full-Time",
        salaryRange: "$85,000 - $110,000",
        level: "Individual Contributor",
        category: "Channel & Reseller",
        region: "NAmer",
        description: "Identify and develop new partner relationships. Support partner onboarding and initial engagement activities.",
        link: "https://segment.com/careers/partner-development-representative",
        isFeatured: false,
        isRemote: true,
        hasEquity: true,
        hasVisa: false,
        companyStage: "Acquired",
        companySize: "501-1000",
        status: "active",
        postedDate: new Date().toISOString(),
        learnMoreClicks: 0,
        totalClicks: 0,
        createdAt: new Date().toISOString()
    }
];

async function addJobs() {
    console.log('🚀 Starting to add jobs to Firestore...\n');
    
    const jobsRef = db.collection('jobs');
    let successCount = 0;
    let errorCount = 0;
    
    for (const job of jobsData) {
        try {
            // Convert dates to Firestore Timestamps
            const firestoreJob = {
                ...job,
                postedDate: admin.firestore.Timestamp.fromDate(new Date(job.postedDate)),
                createdAt: admin.firestore.Timestamp.fromDate(new Date(job.createdAt))
            };
            
            if (job.featuredExpiryDate) {
                firestoreJob.featuredExpiryDate = admin.firestore.Timestamp.fromDate(new Date(job.featuredExpiryDate));
            }
            
            await jobsRef.add(firestoreJob);
            console.log(`✅ Added: ${job.title} at ${job.company}`);
            successCount++;
        } catch (error) {
            console.error(`❌ Error adding job ${job.title}:`, error.message);
            errorCount++;
        }
    }
    
    console.log(`\n✨ Job addition complete!`);
    console.log(`   ✅ Successfully added: ${successCount} jobs`);
    console.log(`   ❌ Errors: ${errorCount} jobs`);
    console.log(`\n🎉 All done! Your jobs are now in Firestore.`);
    
    process.exit(0);
}

addJobs().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

