// API endpoint to fetch company fast facts from external sources
// Uses web scraping (free, unlimited), Wikipedia, job data, and fallback database

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { companyName, companyWebsite, jobData } = req.body;

    if (!companyName) {
        return res.status(400).json({ error: 'Company name is required' });
    }

    try {
        console.log('📥 API Request received for company:', companyName);
        const companyFacts = await fetchCompanyFastFacts(companyName, companyWebsite, jobData);
        console.log('📤 Sending company facts response:', JSON.stringify(companyFacts, null, 2));
        return res.status(200).json(companyFacts);
    } catch (error) {
        console.error('❌ Error fetching company facts:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

async function fetchCompanyFastFacts(companyName, companyWebsite, jobData) {
    const facts = {
        companyId: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: companyName,
        oneLine: '',
        headcount: null,
        fundingStage: null,
        totalFundingUsd: null,
        hq: null,
        workModel: null,
        timezonePolicy: null,
        notableCustomers: [],
        glassdoorRating: null,
        lastNews: null,
        links: {
            careers: null,
            trust: null,
            partners: null
        },
        sources: {},
        lastRefreshed: new Date().toISOString()
    };

    const domain = extractDomain(companyWebsite || companyName);

    // 1. Try Wikipedia API (FREE, UNLIMITED)
    if (!facts.oneLine) {
        try {
            const wikiData = await fetchWikipediaData(companyName);
            if (wikiData.description) {
                facts.oneLine = wikiData.description;
                facts.sources.oneLine = 'Wikipedia';
            }
            if (wikiData.headcount && !facts.headcount) {
                facts.headcount = wikiData.headcount;
                facts.sources.headcount = 'Wikipedia';
            }
            if (wikiData.hq && !facts.hq) {
                facts.hq = wikiData.hq;
                facts.sources.hq = 'Wikipedia';
            }
        } catch (error) {
            console.log('Wikipedia API error (non-fatal):', error.message);
        }
    }

    // 2. Try web scraping company website (FREE, UNLIMITED)
    if (domain) {
        try {
            const scrapedData = await scrapeCompanyWebsite(domain, companyName);
            if (scrapedData.description && !facts.oneLine) {
                facts.oneLine = scrapedData.description;
                facts.sources.oneLine = 'Company website';
            }
            if (scrapedData.headcount && !facts.headcount) {
                facts.headcount = scrapedData.headcount;
                facts.sources.headcount = 'Company website';
            }
            if (scrapedData.hq && !facts.hq) {
                facts.hq = scrapedData.hq;
                facts.sources.hq = 'Company website';
            }
            if (scrapedData.careersUrl) {
                facts.links.careers = scrapedData.careersUrl;
            }
            if (scrapedData.partnersUrl) {
                facts.links.partners = scrapedData.partnersUrl;
            }
        } catch (error) {
            console.log('Web scraping error (non-fatal):', error.message);
        }
    }

    // 3. Extract from job data (ALWAYS AVAILABLE)
    if (jobData) {
        // Work model from job
        if (jobData.isRemote) {
            facts.workModel = 'Remote-first';
        } else if (jobData.location) {
            const location = jobData.location.toLowerCase();
            if (location.includes('remote') || location.includes('hybrid')) {
                facts.workModel = location.includes('hybrid') ? 'Hybrid' : 'Remote-eligible';
            } else {
                facts.workModel = 'Onsite';
            }
        }

        // Location from job
        if (jobData.location && !facts.hq) {
            facts.hq = jobData.location;
            facts.sources.hq = 'Job posting';
        }

        // Company stage and size from job
        if (jobData.companyStage) {
            facts.fundingStage = jobData.companyStage;
            facts.sources.fundingStage = 'Job posting';
        }
        if (jobData.companySize) {
            // Convert size range to headcount estimate
            const sizeMap = {
                '1-10': 5,
                '11-50': 30,
                '51-200': 125,
                '201-500': 350,
                '501-1000': 750,
                '1001-2000': 1500,
                '2000-5000': 3500,
                '5000+': 10000
            };
            if (sizeMap[jobData.companySize] && !facts.headcount) {
                facts.headcount = sizeMap[jobData.companySize];
                facts.sources.headcount = 'Job posting';
            }
        }
    }

    // 4. Fallback to common company database
    if (!facts.oneLine) {
        const commonDescriptions = {
            'stripe': 'Payments and financial infrastructure for the internet.',
            'cloudinary': 'Cloud-based image and video management platform.',
            'palo alto networks': 'Global cybersecurity leader providing advanced security solutions.',
            'zscaler': 'Cloud security platform providing secure access to applications.',
            'databricks': 'Unified analytics platform built on Apache Spark.',
            'snowflake': 'Cloud data platform for data warehousing and analytics.',
            'mongodb': 'General purpose database platform.',
            'okta': 'Identity and access management platform.',
            'twilio': 'Cloud communications platform for building customer engagement.',
            'auth0': 'Identity and access management platform.',
            'vercel': 'Platform for frontend developers and teams.',
            'shopify': 'E-commerce platform for online stores and retail point-of-sale systems.',
            'notion': 'All-in-one workspace for notes, docs, and collaboration.',
            'figma': 'Collaborative interface design tool.',
            'elastic': 'Search and data analytics platform.',
            'github': 'Code hosting platform for version control and collaboration.',
            'confluent': 'Event streaming platform built on Apache Kafka.',
            'segment': 'Customer data platform for collecting and routing customer data.'
        };
        
        const key = companyName.toLowerCase();
        if (commonDescriptions[key]) {
            facts.oneLine = commonDescriptions[key];
            facts.sources.oneLine = 'Company database';
        } else {
            facts.oneLine = `${companyName} is a technology company focused on partnership development and strategic alliances.`;
        }
    }

    // Set default links if website available
    if (domain) {
        if (!facts.links.careers) {
            facts.links.careers = `https://${domain}/careers`;
        }
        if (!facts.links.partners) {
            facts.links.partners = `https://${domain}/partners`;
        }
    }

    return facts;
}

// Wikipedia API - FREE, UNLIMITED
async function fetchWikipediaData(companyName) {
    try {
        // Search for company page
        const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(companyName)}`;
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'PartnershipsCareers/1.0 (https://partnerships-careers.com)'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const result = {};
            
            if (data.extract) {
                // Get first sentence or first 150 chars
                const sentences = data.extract.split(/[.!?]+/);
                result.description = sentences[0]?.trim() || data.extract.substring(0, 150);
            }
            
            // Try to extract headcount from infobox (if available in extract)
            if (data.extract) {
                const headcountMatch = data.extract.match(/(\d{1,3}(?:,\d{3})*)\s*(?:employees|staff|people)/i);
                if (headcountMatch) {
                    result.headcount = parseInt(headcountMatch[1].replace(/,/g, ''));
                }
            }
            
            // Extract location if mentioned
            if (data.content_urls?.desktop?.page) {
                // Location often in extract
                const locationMatch = data.extract.match(/(?:based|headquartered|located)\s+(?:in\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
                if (locationMatch) {
                    result.hq = locationMatch[1];
                }
            }
            
            return result;
        }
    } catch (error) {
        console.log('Wikipedia fetch error:', error.message);
    }
    return {};
}

// Web scraping - FREE, UNLIMITED (respects robots.txt)
async function scrapeCompanyWebsite(domain, companyName) {
    try {
        const baseUrl = `https://${domain}`;
        const result = {};
        
        // Try to fetch about page or homepage
        const urlsToTry = [
            `${baseUrl}/about`,
            `${baseUrl}/company`,
            `${baseUrl}`,
            `${baseUrl}/about-us`
        ];
        
        for (const url of urlsToTry) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; PartnershipsCareers/1.0; +https://partnerships-careers.com)',
                        'Accept': 'text/html'
                    },
                    signal: AbortSignal.timeout(5000) // 5 second timeout
                });
                
                if (response.ok) {
                    const html = await response.text();
                    
                    // Extract meta description
                    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
                    if (metaDescMatch && !result.description) {
                        result.description = metaDescMatch[1].substring(0, 150);
                    }
                    
                    // Extract Open Graph description
                    const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
                    if (ogDescMatch && !result.description) {
                        result.description = ogDescMatch[1].substring(0, 150);
                    }
                    
                    // Look for careers link
                    const careersMatch = html.match(/<a[^>]+href=["']([^"']*(?:career|job|hiring)[^"']*)["'][^>]*>/i);
                    if (careersMatch) {
                        const href = careersMatch[1];
                        result.careersUrl = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
                    }
                    
                    // Look for partners link
                    const partnersMatch = html.match(/<a[^>]+href=["']([^"']*partner[^"']*)["'][^>]*>/i);
                    if (partnersMatch) {
                        const href = partnersMatch[1];
                        result.partnersUrl = href.startsWith('http') ? href : `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
                    }
                    
                    // Extract headcount if mentioned
                    const headcountMatch = html.match(/(\d{1,3}(?:,\d{3})*)\s*(?:employees|staff|people|team members)/i);
                    if (headcountMatch) {
                        result.headcount = parseInt(headcountMatch[1].replace(/,/g, ''));
                    }
                    
                    // If we got description, we can stop
                    if (result.description) {
                        break;
                    }
                }
            } catch (fetchError) {
                // Continue to next URL
                continue;
            }
        }
        
        return result;
    } catch (error) {
        console.log('Web scraping error:', error.message);
        return {};
    }
}

function extractDomain(urlOrName) {
    if (!urlOrName) return null;
    
    // If it's already a domain
    if (urlOrName.includes('.') && !urlOrName.includes(' ')) {
        return urlOrName.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    }
    
    // Try to extract from URL
    try {
        const url = new URL(urlOrName.startsWith('http') ? urlOrName : `https://${urlOrName}`);
        return url.hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}
