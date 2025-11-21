// Vercel Serverless Function to parse job listing from URL using Hugging Face AI
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Use a good instruction-following model for structured extraction
// Options: mistralai/Mistral-7B-Instruct-v0.2, meta-llama/Llama-2-7b-chat-hf, or google/flan-t5-xxl
const MODEL_NAME = process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';

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
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Check if Hugging Face API key is configured
    if (!process.env.HUGGINGFACE_API_KEY) {
      return res.status(500).json({ 
        error: 'AI parsing not configured. Please add HUGGINGFACE_API_KEY to environment variables.' 
      });
    }

    // Fetch the URL content
    console.log('Fetching URL content:', url);
    const fetchResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch URL: ${fetchResponse.status} ${fetchResponse.statusText}`);
    }

    const htmlContent = await fetchResponse.text();
    
    // Extract text from HTML (simple approach - remove script/style tags and get text)
    let textContent = htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit text length to avoid token limits (keep first 6000 characters for Hugging Face)
    if (textContent.length > 6000) {
      textContent = textContent.substring(0, 6000) + '...';
    }

    if (!textContent || textContent.length < 100) {
      return res.status(400).json({ 
        error: 'Could not extract meaningful content from URL. The page may be empty or require authentication.' 
      });
    }

    console.log('Extracted text content length:', textContent.length);

    // Use Hugging Face to extract structured job data
    const prompt = `You are a job listing parser. Extract structured data from the following job listing content. Return ONLY a valid JSON object with these exact fields (use empty strings or null for missing data):

{
  "title": "Job title",
  "company": "Company name",
  "location": "Location (city, state or Remote)",
  "type": "Full-Time, Part-Time, Contract, or Remote",
  "level": "Individual Contributor, Manager, Director, VP, or C-Level",
  "category": "Channel & Reseller, Partner Marketing, Partner Sales, Partner Success, or Partner Operations",
  "region": "NAmer, EMEA, APAC, or LATAM",
  "description": "Full job description",
  "link": "Application URL (use the provided URL if not found)",
  "salaryRange": "Salary range if mentioned (e.g., $120K-$180K)",
  "companyLogo": "",
  "companyStage": "Startup, Series A, Series B, Series C+, Public, or Private",
  "companySize": "1-10, 11-50, 51-200, 201-500, 501-1000, or 1000+",
  "isRemote": true or false,
  "hasEquity": true or false,
  "hasVisa": true or false
}

Job listing content:
${textContent}

Return ONLY the JSON object, no other text.`;

    console.log('Sending to Hugging Face for parsing...');
    
    // Use textGeneration for instruction-following models
    const response = await hf.textGeneration({
      model: MODEL_NAME,
      inputs: prompt,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.3,
        return_full_text: false,
        do_sample: true,
      },
    });

    const aiResponse = response.generated_text?.trim();
    
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log('AI Response:', aiResponse);

    // Parse the JSON response - try to extract JSON from the response
    let parsedData;
    try {
      // Try parsing directly
      parsedData = JSON.parse(aiResponse);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks or text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('Failed to parse extracted JSON:', jsonMatch[0]);
          throw new Error('AI response is not valid JSON');
        }
      } else {
        console.error('No JSON found in AI response:', aiResponse);
        throw new Error('AI response does not contain valid JSON');
      }
    }

    // Ensure link is set to the provided URL if not found
    if (!parsedData.link || parsedData.link === '') {
      parsedData.link = url;
    }

    // Set defaults for required fields if missing
    parsedData.type = parsedData.type || 'Full-Time';
    parsedData.level = parsedData.level || 'Manager';
    parsedData.category = parsedData.category || 'Channel & Reseller';
    parsedData.region = parsedData.region || 'NAmer';
    parsedData.isRemote = parsedData.isRemote || false;
    parsedData.hasEquity = parsedData.hasEquity || false;
    parsedData.hasVisa = parsedData.hasVisa || false;

    // Ensure boolean fields are actually booleans
    if (typeof parsedData.isRemote === 'string') {
      parsedData.isRemote = parsedData.isRemote.toLowerCase() === 'true';
    }
    if (typeof parsedData.hasEquity === 'string') {
      parsedData.hasEquity = parsedData.hasEquity.toLowerCase() === 'true';
    }
    if (typeof parsedData.hasVisa === 'string') {
      parsedData.hasVisa = parsedData.hasVisa.toLowerCase() === 'true';
    }

    console.log('Parsed data:', parsedData);

    return res.status(200).json(parsedData);

  } catch (error) {
    console.error('Error parsing job URL:', error);
    return res.status(500).json({ 
      error: 'Failed to parse job URL', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
