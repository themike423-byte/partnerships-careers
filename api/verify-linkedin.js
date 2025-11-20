// Vercel Serverless Function to verify LinkedIn OAuth and get user data
import Stripe from 'stripe';

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
    const { code, redirectUri } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const clientId = process.env.VITE_LINKEDIN_CLIENT_ID || process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'LinkedIn credentials not configured' });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri || `${process.env.SITE_URL || 'http://localhost:3000'}/auth/linkedin/callback`,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('LinkedIn token error:', errorText);
      return res.status(400).json({ error: 'Failed to exchange code for token' });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).json({ error: 'No access token received' });
    }

    // Get user profile from LinkedIn using OpenID Connect userinfo endpoint
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('LinkedIn profile error:', errorText);
      return res.status(400).json({ error: 'Failed to fetch LinkedIn profile' });
    }

    const profile = await profileResponse.json();

    // Get email - OpenID Connect includes email in userinfo
    let email = profile.email || '';
    
    // If email not in userinfo, try to get from profile sub claim
    if (!email) {
      try {
        // Try alternative endpoint
        const emailResponse = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          if (emailData.elements && emailData.elements[0] && emailData.elements[0]['handle~']) {
            email = emailData.elements[0]['handle~'].emailAddress;
          }
        }
      } catch (emailError) {
        console.error('LinkedIn email error:', emailError);
        // Continue without email - will error later if not available
      }
    }

    // Get profile URL - try to construct from sub or preferred_username
    let profileUrl = '';
    if (profile.preferred_username) {
      profileUrl = `https://www.linkedin.com/in/${profile.preferred_username}`;
    } else if (profile.sub) {
      // Try to get profile URL from profile API
      try {
        const profileApiResponse = await fetch('https://api.linkedin.com/v2/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        if (profileApiResponse.ok) {
          const profileData = await profileApiResponse.json();
          if (profileData.vanityName) {
            profileUrl = `https://www.linkedin.com/in/${profileData.vanityName}`;
          }
        }
      } catch (profileError) {
        console.error('LinkedIn profile API error:', profileError);
      }
    }

    // Extract user data
    const userData = {
      linkedinId: profile.sub || profile.id || '',
      firstName: profile.given_name || profile.firstName || '',
      lastName: profile.family_name || profile.lastName || '',
      email: email,
      jobTitle: profile.headline || '', // LinkedIn headline often contains job title
      profilePicture: profile.picture || profile.profilePicture || '',
      profileUrl: profileUrl,
      company: '', // Will be extracted from email domain
    };

    res.status(200).json({ 
      success: true,
      userData: userData,
      accessToken: accessToken, // Store temporarily for additional API calls if needed
    });
    
  } catch (error) {
    console.error('Error verifying LinkedIn:', error);
    res.status(500).json({ error: error.message || 'Failed to verify LinkedIn account' });
  }
}

