# LinkedIn App Setup Guide - Complete Step-by-Step Instructions

## 🎯 What You're Doing

You're creating a LinkedIn app so that employers can sign in to your job board using their LinkedIn account. This verifies they're real recruiters/HR professionals.

---

## 📋 Step 1: Create a LinkedIn Developer Account

### What You Need:
- A LinkedIn account (you already have one!)

### Steps:
1. **Open your web browser** (Chrome, Firefox, Edge, etc.)
2. **Go to:** https://www.linkedin.com/developers/apps
3. **Sign in** with your LinkedIn account
4. You should see a page that says "My Apps" or "Create app"

**✅ You're done with Step 1!**

---

## 📋 Step 2: Create a New LinkedIn App

### Steps:
1. **Click the "Create app" button** (it might be blue, green, or say "+ Create app")
2. **Fill out the form:**

   **App name:** 
   - Type: `Partnerships Careers` (or whatever you want to call it)
   - This is what users will see when they sign in with LinkedIn
   
   **LinkedIn Page:**
   - Select your company page (or create one if you don't have one)
   - If you don't have a company page, select your personal profile
   - **Don't worry** if you don't have a company page - you can use your personal profile

   **App logo:**
   - Upload a logo for your app (optional but recommended)
   - Use your company logo or a simple icon
   - Size: 100x100 pixels is best

   **Privacy policy URL:**
   - This is a webpage that explains your privacy policy
   - **For now, use:** `https://your-production-url.vercel.app/privacy` 
   - (We'll create this page later, or you can use your main website URL)
   - **Temporary option:** Use your main website URL like `https://your-website.com`

   **App terms:**
   - Check the box that says you agree to LinkedIn's terms
   - Read it if you want (it's legal stuff)

3. **Click "Create app"** at the bottom

**✅ You're done with Step 2!**

---

## 📋 Step 3: Get Your App Credentials

### Steps:
1. **After creating the app**, you'll see a page with tabs at the top
2. **Click on the "Auth" tab** (or it might say "Authentication")
3. **You'll see a section called "Authentication"** with some information

**What you need to find:**
- **Client ID:** This is a long string of letters and numbers (like `86abc123xyz456`)
- **Client Secret:** This might be hidden - click "Show" or "Reveal" to see it

### How to Copy Them:
1. **Right-click** on the Client ID number
2. **Select "Copy"** from the menu
3. **Paste it into a text file** (like Notepad) and save it somewhere safe
4. **Do the same for Client Secret** (after revealing it)

**⚠️ IMPORTANT:** 
- Keep these secret! Don't share them publicly
- Save them somewhere you can find them later
- You'll need them in Step 5

**✅ You're done with Step 3!**

---

## 📋 Step 4: Set Up Redirect URLs

### What This Means:
LinkedIn needs to know which website is allowed to use your app. This is for security.

### Steps:
1. **Still on the "Auth" tab**
2. **Scroll down** until you see "Authorized redirect URLs for your app"
3. **You'll see a text box** where you can add URLs

**Add these URLs (one per line):**
```
http://localhost:3000/auth/linkedin/callback
https://your-production-url.vercel.app/auth/linkedin/callback
```

**⚠️ Important Notes:**
- Replace `your-production-url` with your actual website URL
- You won't know the production URL until after you deploy
- **That's okay!** Add the localhost one for now
- We'll add the production URL later (Step 7)

### How to Add URLs:
1. **Click in the text box**
2. **Type:** `http://localhost:3000/auth/linkedin/callback`
3. **Press Enter** to add another line
4. **Type:** `https://your-production-url.vercel.app/auth/linkedin/callback`
   - (Replace `your-production-url` with your actual website domain)
5. **Click "Update"** or "Save" at the bottom

**✅ You're done with Step 4!**

---

## 📋 Step 5: Request API Permissions

### What This Means:
You need to ask LinkedIn for permission to get users' information (like their email and job title).

### Steps:
1. **Still on the "Auth" tab**
2. **Scroll down** to find "Products" or "Request access to products"
3. **You'll see a list of products** - these are different types of information LinkedIn can share

**You need to enable these:**
- ✅ **Sign In with LinkedIn using OpenID Connect** (this is the main one!)
- ✅ **Profile** (to get their name and job title)

### How to Enable:
1. **Click "Request access"** or a button next to "Sign In with LinkedIn using OpenID Connect"
2. **Fill out the form:**
   - **What is your use case?** 
     - Type: "Allow employers to sign in and verify their job titles for job posting platform"
   - **Who will be using this app?**
     - Select: "Company employees" or "Both company employees and external users"
   - **What will you do with the data?**
     - Type: "Verify users are recruiters/HR professionals and enable job posting functionality"
3. **Click "Request"** or "Submit"

**⚠️ Note:**
- LinkedIn might approve immediately, or it might take a few days
- Some permissions are automatically approved
- Others require LinkedIn to review your request
- **Don't worry** - you can still test with the basic permissions first

**✅ You're done with Step 5!**

---

## 📋 Step 6: Add Your Credentials to Your Website

### What You're Doing:
You're giving your website the secret codes so it can talk to LinkedIn.

### Steps:

#### Option A: For Local Testing (On Your Computer)

1. **Open your project folder** in your code editor (VS Code, etc.)
2. **Find the `.env` file** in the main folder
   - If you don't see it, you might need to create it
   - It should be in the same folder as `package.json`
3. **Open the `.env` file**
4. **Add these lines** (replace with your actual values):

```
VITE_LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
```

**Example:**
```
VITE_LINKEDIN_CLIENT_ID=86abc123xyz456
LINKEDIN_CLIENT_SECRET=7def789ghi012
```

**⚠️ Important:**
- Replace `your_client_id_here` with your actual Client ID from Step 3
- Replace `your_client_secret_here` with your actual Client Secret from Step 3
- Don't include any spaces
- Don't add quotes around the values

5. **Save the file**

#### Option B: For Production (On Vercel)

**After you deploy your website to Vercel:**

1. **Go to:** https://vercel.com/
2. **Sign in** to your account
3. **Click on your project** (partnerships-careers)
4. **Click "Settings"** (in the top menu)
5. **Click "Environment Variables"** (in the left sidebar)
6. **Click "Add New"** button
7. **Add each variable separately:**

   **First Variable:**
   - **Name:** `VITE_LINKEDIN_CLIENT_ID`
   - **Value:** (paste your Client ID from Step 3)
   - **Environment:** Check all boxes (Production, Preview, Development)
   - **Click "Save"**

   **Second Variable:**
   - **Click "Add New"** again
   - **Name:** `LINKEDIN_CLIENT_SECRET`
   - **Value:** (paste your Client Secret from Step 3)
   - **Environment:** Check all boxes (Production, Preview, Development)
   - **Click "Save"**

**✅ You're done with Step 6!**

---

## 📋 Step 7: Update Redirect URLs After Deployment

### When to Do This:
**After you deploy your website to Vercel** and get your production URL.

### Steps:
1. **Go back to:** https://www.linkedin.com/developers/apps
2. **Click on your app** (Partnerships Careers)
3. **Click the "Auth" tab**
4. **Scroll to "Authorized redirect URLs"**
5. **Find the URL you added earlier** that said `your-production-url`
6. **Replace it with your actual Vercel URL:**
   - Example: `https://partnerships-careers-abc123.vercel.app/auth/linkedin/callback`
7. **Click "Update" or "Save"**

**✅ You're done with Step 7!**

---

## ✅ Checklist - Did You Do Everything?

Before testing, make sure you've:

- [ ] Created a LinkedIn Developer account
- [ ] Created a LinkedIn app
- [ ] Copied your Client ID and saved it
- [ ] Copied your Client Secret and saved it
- [ ] Added redirect URLs (localhost for now)
- [ ] Requested API permissions (Sign In with LinkedIn)
- [ ] Added credentials to `.env` file (for local testing)
- [ ] Added credentials to Vercel (for production)
- [ ] Updated redirect URLs with production URL (after deployment)

---

## 🆘 Troubleshooting

### Problem: "I can't find the Create app button"
**Solution:** Make sure you're signed in to LinkedIn. Try refreshing the page.

### Problem: "I don't have a company page"
**Solution:** That's okay! Use your personal LinkedIn profile. You can create a company page later if you want.

### Problem: "LinkedIn won't approve my permissions"
**Solution:** 
- Make sure you filled out the use case form completely
- Be specific about what you're building
- Wait a few days - some approvals take time
- Basic permissions are usually approved automatically

### Problem: "I can't find Client Secret"
**Solution:** 
- Look for a "Show" or "Reveal" button next to where it says "Client Secret"
- Click that button to reveal it
- It might be hidden for security reasons

### Problem: "The redirect URL doesn't work"
**Solution:**
- Make sure the URL matches exactly (including `http://` vs `https://`)
- Make sure there are no extra spaces
- Make sure you added it to the right section (Authorized redirect URLs)
- Try copying and pasting the URL directly

### Problem: "I lost my credentials"
**Solution:**
- Go back to your LinkedIn app dashboard
- Click "Auth" tab
- Your Client ID and Client Secret are always there
- You can reset your Client Secret if needed (but you'll need to update it everywhere)

---

## 📞 Need Help?

If you get stuck:
1. Take a screenshot of the error or what you're seeing
2. Note which step you're on
3. Ask for help and provide:
   - The step number
   - What you're trying to do
   - What error you're seeing (if any)
   - A screenshot if possible

---

## 🎉 You're Done!

Once you complete these steps, your LinkedIn integration will be ready to test!

**Next Steps:**
- Test locally (on your computer) first
- Then test in production (on your live website)
- If everything works, employers can sign in with LinkedIn!

