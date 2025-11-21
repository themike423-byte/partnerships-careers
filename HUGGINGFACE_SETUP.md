# Hugging Face AI Setup Guide

This guide will help you set up Hugging Face for AI-powered job parsing.

## Step 1: Create a Hugging Face Account

1. Go to [https://huggingface.co/](https://huggingface.co/)
2. Sign up for a free account (or sign in if you already have one)

## Step 2: Generate an Access Token

1. Navigate to [Hugging Face Settings → Access Tokens](https://huggingface.co/settings/tokens)
2. Click **"New token"**
3. Provide a name (e.g., "Partnerships Careers AI Parser")
4. Select the appropriate role:
   - **Read**: For accessing public models (recommended for most use cases)
   - **Write**: If you need to use private models or create repositories
5. Click **"Generate token"**
6. **Copy the token immediately** (it starts with `hf_` and you won't be able to see it again)

## Step 3: Add Token to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **partnerships-careers**
3. Go to **Settings → Environment Variables**
4. Click **"Add New"**
5. Add the following variables:

   **Required:**
   - **Name:** `HUGGINGFACE_API_KEY`
   - **Value:** `hf_...` (paste your token here)
   - **Environment:** Select "Production", "Preview", and "Development" (or just "Production" if you prefer)

   **Optional (Advanced):**
   - **Name:** `HUGGINGFACE_MODEL`
   - **Value:** `mistralai/Mistral-7B-Instruct-v0.2` (or another model of your choice)
   - **Environment:** Same as above

6. Click **"Save"**

## Step 4: Redeploy

After adding the environment variable, you need to redeploy:

1. In Vercel, go to **Deployments**
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**

Or use the CLI:
```bash
vercel --prod --yes
```

## Available Models

The default model is `mistralai/Mistral-7B-Instruct-v0.2`, which is:
- ✅ Free to use (within rate limits)
- ✅ Good at following instructions
- ✅ Returns structured JSON

### Alternative Models

You can use any instruction-following model. Popular options:

- `mistralai/Mistral-7B-Instruct-v0.2` (default - recommended)
- `meta-llama/Llama-2-7b-chat-hf` (requires access request)
- `google/flan-t5-xxl` (larger, slower, but very accurate)
- `microsoft/DialoGPT-large` (conversational)

**Note:** Some models may require access approval. Check the model page on Hugging Face.

## Testing

After setup, test the AI parsing:

1. Go to your employer dashboard
2. Click "Post a Featured Job"
3. Select "URL Upload (powered by AI)"
4. Paste a job listing URL
5. The AI should automatically extract all fields

## Troubleshooting

### Error: "AI parsing not configured"
- Make sure `HUGGINGFACE_API_KEY` is set in Vercel
- Redeploy after adding the variable

### Error: "Model not found" or "Access denied"
- Check that the model name is correct
- Some models require access approval - visit the model page on Hugging Face
- Try the default model: `mistralai/Mistral-7B-Instruct-v0.2`

### Error: "Rate limit exceeded"
- Hugging Face free tier has rate limits
- Wait a few minutes and try again
- Consider upgrading to a paid plan for higher limits

### AI returns incomplete data
- The model might need a better prompt
- Try a different model (set `HUGGINGFACE_MODEL` environment variable)
- Some job listings may be too complex or poorly formatted

## Cost

- **Free tier:** Hugging Face offers free API access with rate limits
- **Paid plans:** Available for higher usage and faster responses
- **No credit card required** for the free tier

## Security

- ✅ Your API key is stored securely in Vercel environment variables
- ✅ Never commit your API key to GitHub
- ✅ The key is only used server-side (in API routes)

---

**Need help?** Check the [Hugging Face Documentation](https://huggingface.co/docs) or contact support.

