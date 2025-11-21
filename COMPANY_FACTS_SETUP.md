# Company Fast Facts Integration

This feature replaces the repetitive "About [Company]" section with structured company fast facts pulled from **completely free, unlimited** data sources.

## What It Does

When users click "Learn More" on a job, they now see:
1. **About the Role** - Role summary (unchanged)
2. **Company Fast Facts** - Structured data including:
   - Headcount
   - Funding Stage
   - HQ Location
   - Work Model (Remote-first, Hybrid, Onsite, etc.)
   - Links to Careers and Partners pages

## Data Sources (All FREE, UNLIMITED)

The system uses multiple **completely free** data sources in priority order:

### 1. **Wikipedia API** (Primary - FREE, UNLIMITED)
   - ✅ **Completely free** - No API key needed
   - ✅ **Unlimited requests** - No rate limits
   - ✅ Provides: Company description, headcount, HQ location
   - ✅ Uses official Wikipedia REST API
   - **No setup required!**

### 2. **Web Scraping** (Secondary - FREE, UNLIMITED)
   - ✅ **Completely free** - No API key needed
   - ✅ **Unlimited requests** - Scrapes company websites directly
   - ✅ Provides: Company description, careers/partners links, headcount
   - ✅ Respects robots.txt and uses proper User-Agent
   - ✅ 5-second timeout per request
   - **No setup required!**

### 3. **Job Data** (Always Available)
   - ✅ Extracts: work model, location, company stage, company size
   - ✅ Always available, no API needed
   - **No setup required!**

### 4. **Common Company Database** (Fallback)
   - ✅ Hardcoded descriptions for major tech companies
   - ✅ Used when other sources are unavailable
   - **No setup required!**

## Setup

**NO SETUP REQUIRED!** 🎉

This solution uses only free, unlimited APIs and web scraping. There are:
- ❌ No API keys to configure
- ❌ No rate limits to worry about
- ❌ No credit limits
- ❌ No paid tiers

Just deploy and it works!

## How It Works

1. **User clicks "Learn More"** on a job
2. **System checks Firestore** for cached company facts (cached for 7 days)
3. **If not cached or stale**, fetches from:
   - **Wikipedia API** (free, unlimited) - Gets company description, headcount, location
   - **Web scraping** (free, unlimited) - Scrapes company website for description, links
   - **Job data** (always available) - Extracts work model, location, stage
   - **Common database** (fallback) - Uses known company descriptions
4. **Data is cached** in Firestore `companies` collection under `fastFacts` field
5. **UI displays** structured fast facts in a grid layout

## Data Structure

```typescript
{
  companyId: string;
  name: string;
  oneLine: string;
  headcount?: number;
  fundingStage?: string;
  totalFundingUsd?: number;
  hq?: string;
  workModel?: "Remote-first" | "Remote-eligible" | "Hybrid" | "Onsite";
  timezonePolicy?: string;
  notableCustomers?: string[];
  glassdoorRating?: number;
  lastNews?: { title: string; date: string; url: string };
  links: {
    careers?: string;
    trust?: string;
    partners?: string;
  };
  sources: Record<string, string>;
  lastRefreshed: string;
}
```

## Caching

- Company facts are cached in Firestore for **7 days**
- After 7 days, data is refreshed on next "Learn More" click
- Caching reduces API calls and improves performance
- Wikipedia and web scraping are fast, so even uncached requests are quick

## Why This Solution is Better

### ✅ Completely Free
- No API keys needed
- No credit limits
- No paid tiers
- Unlimited usage

### ✅ Reliable
- Multiple fallback sources
- Wikipedia is highly reliable
- Web scraping works for most companies
- Job data always available

### ✅ Fast
- Wikipedia API is very fast
- Web scraping with 5s timeout
- Caching reduces repeat requests
- Parallel fetching when possible

### ✅ Legal & Ethical
- Respects robots.txt
- Uses proper User-Agent headers
- Wikipedia API is public and free
- No scraping of protected content

## Troubleshooting

**No company facts showing?**
- Check browser console for errors
- Verify API endpoint is accessible
- Check Firestore `companies` collection for cached data
- Wikipedia may not have page for very new/small companies

**Slow loading?**
- First request may take 2-5 seconds (web scraping)
- Subsequent requests are cached and instant
- Check network tab for timeout issues

**Data not updating?**
- Clear Firestore cache by deleting `fastFacts` field from company document
- Wait 7 days for automatic refresh
- Or manually trigger refresh by clicking "Learn More" again

**Wikipedia not finding company?**
- System falls back to web scraping
- Then falls back to job data
- Then falls back to common database
- Always returns at least basic description

## Future Enhancements

Potential additions (all free):
- **Wikidata API** - More structured company data
- **OpenCorporates API** - Company registration data (free tier)
- **Better web scraping** - More sophisticated extraction
- **LinkedIn public data** - Company pages (respecting ToS)
