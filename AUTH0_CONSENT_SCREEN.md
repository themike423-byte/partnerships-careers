# Auth0 Consent Screen - "dev-xsw8nz51gqudjoik" Display

## Issue
The Auth0 consent screen shows "dev-xsw8nz51gqudjoik" instead of your company name. This is the Auth0 tenant/organization name that appears in Auth0's consent screen.

## Why This Happens
The Auth0 consent screen displays the **Auth0 tenant name**, not your application's company name. This is standard OAuth 2.0 behavior - the identity provider (Auth0) shows its own branding.

## How to Fix (Auth0 Dashboard)
You can customize what appears in the consent screen by:

1. Go to https://manage.auth0.com/
2. Navigate to **Branding** → **Universal Login**
3. Customize the consent screen text and branding
4. You can also set a **Friendly Name** for your Auth0 tenant in **Settings** → **General**

## Alternative: Customize Consent Screen Text
In Auth0 Dashboard:
1. Go to **Branding** → **Universal Login**
2. Click on **Consent Screen** tab
3. Customize the text that appears, including:
   - Application name (currently "Partnerships-Careers")
   - Description
   - Logo

## Note
The consent screen is controlled by Auth0's branding settings, not by your application code. The company name from your app (extracted from email domain) is used internally for organization/company matching, but doesn't appear in Auth0's consent screen.

