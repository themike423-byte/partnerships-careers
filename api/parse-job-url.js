// Vercel Serverless Function to parse job listing from URL using Hugging Face AI
import { HfInference } from '@huggingface/inference';

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
      console.error('[AI Parser] HUGGINGFACE_API_KEY environment variable is not set');
      return res.status(500).json({ 
        error: 'AI parsing not configured. Please add HUGGINGFACE_API_KEY to Vercel environment variables.',
        message: 'Missing HUGGINGFACE_API_KEY'
      });
    }

    // Initialize Hugging Face client inside handler (better for serverless)
    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    console.log('[AI Parser] Hugging Face client initialized');
    console.log('[AI Parser] API key length:', process.env.HUGGINGFACE_API_KEY.length);
    console.log('[AI Parser] API key starts with:', process.env.HUGGINGFACE_API_KEY.substring(0, 5));

    // Fetch the URL content
    console.log('[AI Parser] Fetching URL content:', url);
    let fetchResponse;
    try {
      fetchResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 10000 // 10 second timeout
      });
    } catch (fetchError) {
      console.error('[AI Parser] Failed to fetch URL:', fetchError);
      return res.status(400).json({ 
        error: `Failed to fetch URL: ${fetchError.message}` 
      });
    }

    if (!fetchResponse.ok) {
      return res.status(400).json({ 
        error: `Failed to fetch URL: ${fetchResponse.status} ${fetchResponse.statusText}` 
      });
    }

    const htmlContent = await fetchResponse.text();
    
    // Extract text from HTML (simple approach - remove script/style tags and get text)
    let textContent = htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
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

    console.log('[AI Parser] Extracted text content length:', textContent.length);
    console.log('[AI Parser] First 200 chars:', textContent.substring(0, 200));

    // Use Hugging Face to extract structured job data
    // Format prompt for conversational models (Mistral uses chat format)
    const systemPrompt = `You are a job listing parser. Extract structured data from job listings and return ONLY valid JSON. No explanations, no markdown, no code blocks.`;
    
    const userPrompt = `Extract structured data from the following job listing content. Return ONLY a valid JSON object with these exact fields. Use empty strings "" for missing text fields, false for missing booleans.

Required JSON structure:
{
  "title": "Job title",
  "company": "Company name",
  "location": "Location (city, state or Remote)",
  "type": "Full-Time, Part-Time, Contract, or Remote",
  "level": "Individual Contributor, Manager, Director, VP, or C-Level",
  "category": "Channel & Reseller, Partner Marketing, Partner Sales, Partner Success, or Partner Operations",
  "region": "NAmer, EMEA, APAC, or LATAM",
  "description": "Full job description",
  "link": "${url}",
  "salaryRange": "Salary range if mentioned (e.g., $120K-$180K)",
  "companyLogo": "",
  "companyStage": "Startup, Series A, Series B, Series C+, Public, or Private",
  "companySize": "1-10, 11-50, 51-200, 201-500, 501-1000, or 1000+",
  "isRemote": false,
  "hasEquity": false,
  "hasVisa": false
}

Job listing content:
${textContent}

IMPORTANT: Return ONLY the JSON object. Start with { and end with }.`;

    console.log('[AI Parser] Sending to Hugging Face for parsing...');
    console.log('[AI Parser] Using model:', MODEL_NAME);
    
    let aiResponse;
    try {
      // Try using chatCompletion first (for conversational models like Mistral)
      console.log('[AI Parser] Attempting to use Hugging Face SDK with chatCompletion...');
      
      // Format prompt for chat completion
      const chatMessages = [
        {
          role: 'system',
          content: 'You are a job listing parser. Extract structured data from job listings and return ONLY valid JSON.'
        },
        {
          role: 'user',
          content: prompt.replace(/<s>\[INST\]|\[\/INST\]<\/s>/g, '').trim()
        }
      ];
      
      try {
        const response = await hf.chatCompletion({
          model: MODEL_NAME,
          messages: chatMessages,
          temperature: 0.1,
          max_tokens: 1500,
        });

        aiResponse = response.choices?.[0]?.message?.content?.trim();
        
        if (aiResponse) {
          console.log('[AI Parser] Chat completion succeeded');
          console.log('[AI Parser] Raw AI response length:', aiResponse.length);
          console.log('[AI Parser] First 500 chars of response:', aiResponse.substring(0, 500));
        } else {
          throw new Error('No response from chatCompletion');
        }
      } catch (chatError) {
        // Fallback to textGeneration if chatCompletion fails
        console.log('[AI Parser] Chat completion failed, trying textGeneration...');
        console.log('[AI Parser] Chat error:', chatError.message);
        
        const response = await hf.textGeneration({
          model: MODEL_NAME,
          inputs: prompt,
          parameters: {
            max_new_tokens: 1500,
            temperature: 0.1,
            return_full_text: false,
            do_sample: false,
            top_p: 0.95,
          },
        });

        aiResponse = response.generated_text?.trim();
        
        if (!aiResponse) {
          throw new Error('No response from Hugging Face API');
        }

        console.log('[AI Parser] Text generation succeeded');
        console.log('[AI Parser] Raw AI response length:', aiResponse.length);
        console.log('[AI Parser] First 500 chars of response:', aiResponse.substring(0, 500));
      }
      
    } catch (hfError) {
      // If SDK fails, try direct REST API call as fallback using new router endpoint
      console.log('[AI Parser] SDK failed, trying REST API fallback with new router endpoint...');
      console.error('[AI Parser] SDK error:', hfError.message);
      
      try {
        // Use the new router endpoint
        const apiUrl = `https://router.huggingface.co/models/${MODEL_NAME}`;
        const restResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 1500,
              temperature: 0.1,
              return_full_text: false,
              do_sample: false,
              top_p: 0.95,
            },
          }),
        });

        if (!restResponse.ok) {
          const errorText = await restResponse.text();
          throw new Error(`Hugging Face REST API error (${restResponse.status}): ${errorText}`);
        }

        const restData = await restResponse.json();
        
        // Handle different response formats
        if (restData.generated_text) {
          aiResponse = restData.generated_text.trim();
        } else if (Array.isArray(restData) && restData[0]?.generated_text) {
          aiResponse = restData[0].generated_text.trim();
        } else if (restData[0]?.generated_text) {
          aiResponse = restData[0].generated_text.trim();
        } else {
          throw new Error('Unexpected response format from Hugging Face API');
        }

        if (!aiResponse) {
          throw new Error('No response from Hugging Face REST API');
        }

        console.log('[AI Parser] REST API fallback succeeded');
        console.log('[AI Parser] Raw AI response length:', aiResponse.length);
        console.log('[AI Parser] First 500 chars of response:', aiResponse.substring(0, 500));
        
      } catch (restError) {
        // Both SDK and REST API failed
        console.error('[AI Parser] REST API fallback also failed:', restError);
        console.error('[AI Parser] Original SDK error:', hfError);
        console.error('[AI Parser] Error details:', {
          sdkError: hfError.message,
          restError: restError.message,
          stack: restError.stack || hfError.stack,
          name: restError.name || hfError.name
        });
      
        // Try to extract more specific error information from both errors
        const combinedError = restError.message || hfError.message;
        let errorMessage = 'Failed to parse with AI';
        let errorDetails = combinedError;
        
        if (combinedError.includes('401') || combinedError.includes('Unauthorized')) {
          errorMessage = 'Hugging Face API authentication failed. Please check your HUGGINGFACE_API_KEY in Vercel environment variables.';
          errorDetails = 'Invalid or missing API key';
        } else if (combinedError.includes('403') || combinedError.includes('Forbidden')) {
          errorMessage = 'Hugging Face API access denied. Please check your API key permissions.';
          errorDetails = 'API key does not have access to this model';
        } else if (combinedError.includes('404') || combinedError.includes('Not Found')) {
          errorMessage = `Hugging Face model not found: ${MODEL_NAME}. Please check the model name in HUGGINGFACE_MODEL.`;
          errorDetails = 'Model may not exist or may not be accessible';
        } else if (combinedError.includes('429') || combinedError.includes('Too Many Requests')) {
          errorMessage = 'Hugging Face API rate limit exceeded. Please try again later.';
          errorDetails = 'Rate limit reached';
        } else if (combinedError.includes('503') || combinedError.includes('Service Unavailable')) {
          errorMessage = 'Hugging Face model is currently loading. Please try again in a few moments.';
          errorDetails = 'Model is starting up - this can take 30-60 seconds';
        }
        
        return res.status(500).json({ 
          error: errorMessage,
          message: errorDetails,
          originalError: combinedError,
          model: MODEL_NAME,
          hasApiKey: !!process.env.HUGGINGFACE_API_KEY,
          apiKeyLength: process.env.HUGGINGFACE_API_KEY?.length || 0,
          details: process.env.NODE_ENV === 'development' ? (restError.stack || hfError.stack) : undefined
        });
      }
    }

    // Parse the JSON response - try to extract JSON from the response
    let parsedData;
    try {
      // First, try to clean up the response - remove any markdown code blocks
      let cleanedResponse = aiResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      // Try to find JSON object in the response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      // Try parsing directly
      parsedData = JSON.parse(cleanedResponse);
      console.log('[AI Parser] Successfully parsed JSON');
      
    } catch (parseError) {
      console.error('[AI Parser] Failed to parse JSON:', parseError);
      console.error('[AI Parser] AI response that failed to parse:', aiResponse);
      
      // Try one more time with more aggressive cleaning
      try {
        // Remove everything before first { and after last }
        const firstBrace = aiResponse.indexOf('{');
        const lastBrace = aiResponse.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const extractedJson = aiResponse.substring(firstBrace, lastBrace + 1);
          parsedData = JSON.parse(extractedJson);
          console.log('[AI Parser] Successfully parsed JSON after extraction');
        } else {
          throw new Error('No JSON object found in AI response');
        }
      } catch (secondParseError) {
        return res.status(500).json({ 
          error: 'AI returned invalid JSON format', 
          message: `Failed to parse AI response: ${parseError.message}`,
          aiResponse: aiResponse.substring(0, 1000), // Include first 1000 chars for debugging
          details: process.env.NODE_ENV === 'development' ? parseError.stack : undefined
        });
      }
    }

    // Validate and clean the parsed data
    if (!parsedData || typeof parsedData !== 'object') {
      return res.status(500).json({ 
        error: 'AI returned invalid data structure' 
      });
    }

    // Ensure link is set to the provided URL if not found
    if (!parsedData.link || parsedData.link.trim() === '') {
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
      parsedData.isRemote = parsedData.isRemote.toLowerCase() === 'true' || parsedData.isRemote.toLowerCase() === 'yes';
    }
    if (typeof parsedData.hasEquity === 'string') {
      parsedData.hasEquity = parsedData.hasEquity.toLowerCase() === 'true' || parsedData.hasEquity.toLowerCase() === 'yes';
    }
    if (typeof parsedData.hasVisa === 'string') {
      parsedData.hasVisa = parsedData.hasVisa.toLowerCase() === 'true' || parsedData.hasVisa.toLowerCase() === 'yes';
    }

    // Ensure string fields are strings
    parsedData.title = String(parsedData.title || '').trim();
    parsedData.company = String(parsedData.company || '').trim();
    parsedData.location = String(parsedData.location || '').trim();
    parsedData.description = String(parsedData.description || '').trim();
    parsedData.link = String(parsedData.link || url).trim();
    parsedData.salaryRange = String(parsedData.salaryRange || '').trim();
    parsedData.companyLogo = String(parsedData.companyLogo || '').trim();
    parsedData.companyStage = String(parsedData.companyStage || '').trim();
    parsedData.companySize = String(parsedData.companySize || '').trim();

    console.log('[AI Parser] Successfully parsed job data:', {
      title: parsedData.title,
      company: parsedData.company,
      location: parsedData.location,
      hasDescription: !!parsedData.description,
      descriptionLength: parsedData.description.length
    });

    return res.status(200).json(parsedData);

  } catch (error) {
    console.error('[AI Parser] Unexpected error:', error);
    console.error('[AI Parser] Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Failed to parse job URL', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
