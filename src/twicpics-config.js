// TwicPics Configuration
// Get domain from environment variable or use default
// Set VITE_TWICPICS_DOMAIN in your .env file or Vercel environment variables
export const TWICPICS_DOMAIN = import.meta.env.VITE_TWICPICS_DOMAIN || 'https://partnerships-careers.twic.pics';
// Set VITE_TWICPICS_API_KEY in your .env file or Vercel environment variables
export const TWICPICS_API_KEY = import.meta.env.VITE_TWICPICS_API_KEY || '94a1ffe3-e066-4704-886a-b7f5175b8034';

// TwicPics helper function to get optimized image URL
export const getTwicPicsUrl = (imagePath, options = {}) => {
  if (!imagePath) return '';
  
  // If already a full URL, use it directly
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Remove leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  
  // Build TwicPics URL with options
  const params = new URLSearchParams();
  if (options.width) params.append('twic', `w=${options.width}`);
  if (options.height) params.append('twic', `h=${options.height}`);
  if (options.focus) params.append('twic', `focus=${options.focus}`);
  if (options.output) params.append('twic', `output=${options.output}`);
  if (options.quality) params.append('twic', `quality=${options.quality}`);
  
  const queryString = params.toString();
  return `${TWICPICS_DOMAIN}/${cleanPath}${queryString ? `?${queryString}` : ''}`;
};

