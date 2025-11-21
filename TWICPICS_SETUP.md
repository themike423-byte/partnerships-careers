# TwicPics Integration Setup

## Overview
TwicPics has been integrated into the project for optimized image delivery and processing.

## Environment Variables

Add these to your `.env` file for local development or Vercel environment variables for production:

```bash
# TwicPics Configuration
VITE_TWICPICS_DOMAIN=https://partnerships-careers.twic.pics
VITE_TWICPICS_API_KEY=94a1ffe3-e066-4704-886a-b7f5175b8034
```

## Usage

Import the helper function in your components:

```javascript
import { getTwicPicsUrl } from './twicpics-config';

// Basic usage
const imageUrl = getTwicPicsUrl('/path/to/image.jpg');

// With options
const optimizedUrl = getTwicPicsUrl('/path/to/image.jpg', {
  width: 800,
  height: 600,
  quality: 80,
  focus: 'auto',
  output: 'webp'
});
```

## TwicPics Features

- **Automatic optimization**: Images are automatically optimized for web delivery
- **Responsive images**: Automatically serves appropriate sizes for different devices
- **Format conversion**: Can convert to WebP, AVIF, etc.
- **Lazy loading**: Built-in lazy loading support
- **CDN delivery**: Fast global CDN delivery

## Next Steps

1. Set up your TwicPics domain in the TwicPics dashboard
2. Add environment variables to Vercel
3. Update image references to use `getTwicPicsUrl()` helper function
4. Test image loading and optimization

## Documentation

- TwicPics Docs: https://www.twicpics.com/docs
- API Reference: https://www.twicpics.com/docs/reference

