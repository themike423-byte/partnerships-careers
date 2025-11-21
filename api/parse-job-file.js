// Vercel Serverless Function to parse job listing from file using AI
import OpenAI from 'openai';
import pdf from 'pdf-parse';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    // Handle file upload - expect base64 encoded file
    const { data, fileName, fileType } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'File data is required' });
    }

    // Validate file type
    const isValidType = fileType?.includes('pdf') || 
                       fileType?.includes('msword') || 
                       fileType?.includes('wordprocessingml') ||
                       fileName?.endsWith('.pdf') || 
                       fileName?.endsWith('.doc') || 
                       fileName?.endsWith('.docx');

    if (!isValidType) {
      return res.status(400).json({ error: 'Invalid file type. Please upload a PDF, DOC, or DOCX file.' });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'AI parsing not configured. Please add OPENAI_API_KEY to environment variables.' 
      });
    }

    // Decode base64 file
    const fileBuffer = Buffer.from(data, 'base64');
    
    console.log('Processing file:', fileName, 'Type:', fileType, 'Size:', fileBuffer.length);

    // Extract text from file
    let textContent = '';
    
    if (fileType?.includes('pdf') || fileName?.endsWith('.pdf')) {
      // Extract text from PDF
      try {
        const pdfData = await pdf(fileBuffer);
        textContent = pdfData.text;
      } catch (pdfError) {
        console.error('Error parsing PDF:', pdfError);
        throw new Error('Failed to extract text from PDF file');
      }
    } else {
      // For DOC/DOCX files, we'd need a library like mammoth or docx
      // For now, return an error suggesting PDF
      return res.status(400).json({ 
        error: 'DOC/DOCX parsing not yet implemented. Please convert to PDF and try again, or use URL upload instead.' 
      });
    }

    if (!textContent || textContent.trim().length < 50) {
      return res.status(400).json({ 
        error: 'Could not extract meaningful text from file. The file may be empty, corrupted, or image-based.' 
      });
    }

    // Limit text length to avoid token limits (keep first 8000 characters)
    if (textContent.length > 8000) {
      textContent = textContent.substring(0, 8000) + '...';
    }

    console.log('Extracted text content length:', textContent.length);

    // Use OpenAI to extract structured job data
    const prompt = `You are a job listing parser. Extract structured data from the following job description. Return ONLY a valid JSON object with these exact fields (use empty strings or null for missing data):

{
  "title": "Job title",
  "company": "Company name",
  "location": "Location (city, state or Remote)",
  "type": "Full-Time, Part-Time, Contract, or Remote",
  "level": "Individual Contributor, Manager, Director, VP, or C-Level",
  "category": "Channel & Reseller, Partner Marketing, Partner Sales, Partner Success, or Partner Operations",
  "region": "NAmer, EMEA, APAC, or LATAM",
  "description": "Full job description",
  "link": "Application URL if mentioned, otherwise empty string",
  "salaryRange": "Salary range if mentioned (e.g., $120K-$180K)",
  "companyLogo": "",
  "companyStage": "Startup, Series A, Series B, Series C+, Public, or Private",
  "companySize": "1-10, 11-50, 51-200, 201-500, 501-1000, or 1000+",
  "isRemote": true or false,
  "hasEquity": true or false,
  "hasVisa": true or false
}

Job description content:
${textContent}

Return ONLY the JSON object, no other text.`;

    console.log('Sending to OpenAI for parsing...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using mini for cost efficiency
      messages: [
        {
          role: 'system',
          content: 'You are a job listing parser. Extract structured data and return ONLY valid JSON, no explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent extraction
      response_format: { type: 'json_object' } // Force JSON response
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log('AI Response:', aiResponse);

    // Parse the JSON response
    let parsedData;
    try {
      parsedData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse);
      // Try to extract JSON from the response if it's wrapped in markdown or text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI response is not valid JSON');
      }
    }

    // Set defaults for required fields if missing
    parsedData.type = parsedData.type || 'Full-Time';
    parsedData.level = parsedData.level || 'Manager';
    parsedData.category = parsedData.category || 'Channel & Reseller';
    parsedData.region = parsedData.region || 'NAmer';
    parsedData.isRemote = parsedData.isRemote || false;
    parsedData.hasEquity = parsedData.hasEquity || false;
    parsedData.hasVisa = parsedData.hasVisa || false;
    parsedData.link = parsedData.link || '';

    console.log('Parsed data:', parsedData);

    return res.status(200).json(parsedData);

  } catch (error) {
    console.error('Error parsing job file:', error);
    return res.status(500).json({ 
      error: 'Failed to parse job file', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
