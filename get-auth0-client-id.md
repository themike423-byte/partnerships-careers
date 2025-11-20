# Quick Guide: Get Your Auth0 Client ID

## Step-by-Step:

1. **Open Auth0 Dashboard:**
   - Go to: https://manage.auth0.com/
   - Log in with your Auth0 account

2. **Find Your Application:**
   - Click on **"Applications"** in the left sidebar
   - You should see your application listed (or create a new one if needed)
   - Click on your application name

3. **Get the Client ID:**
   - You'll be on the **Settings** tab
   - Find the **"Client ID"** field (it's near the top)
   - Click the copy icon next to it, or select and copy the value
   - It looks something like: `abc123xyz789` or `a1b2c3d4e5f6g7h8i9j0`

4. **Add it to .env file:**
   - Open the `.env` file in this project
   - Find the line: `VITE_AUTH0_CLIENT_ID=`
   - Add your Client ID after the equals sign:
     ```
     VITE_AUTH0_CLIENT_ID=your_copied_client_id_here
     ```
   - Save the file

5. **Restart your dev server:**
   - Stop the current server (Ctrl+C)
   - Run: `npm run dev`
   - The app should now work!

## Still Need Help?

If you can't find your application or need to create one:
- In Auth0 Dashboard → Applications → Create Application
- Choose "Single Page Web Applications"
- Use React as the technology
- Copy the Client ID from the settings page

