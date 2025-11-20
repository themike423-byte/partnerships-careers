# LinkedIn Employer Verification System - Implementation Guide

## Overview

This system replaces email/password signups for employers with LinkedIn OAuth and adds fully automated verification:

1. **LinkedIn OAuth Only** - Employers must sign in with LinkedIn
2. **Job Title Verification** - Auto-verifies user is a recruiter/HR professional
3. **Domain Locking** - Prevents duplicate company accounts
4. **Request Access Flow** - Automated when company already exists
5. **Admin Approval** - One-click approval in dashboard
6. **Payment Verification** - Required before posting jobs (already implemented)

---

## Implementation Steps

### Step 1: LinkedIn OAuth Setup (Required First)

**LinkedIn App Creation:**
1. Go to https://www.linkedin.com/developers/apps
2. Create new app
3. Get:
   - Client ID
   - Client Secret
4. Add authorized redirect URLs:
   - `http://localhost:3000/auth/linkedin/callback`
   - `https://your-production-url.vercel.app/auth/linkedin/callback`
5. Request permissions:
   - `r_liteprofile` (Basic profile info)
   - `r_emailaddress` (Email address)

**Environment Variables to Add:**
```
VITE_LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
```

---

### Step 2: API Endpoint for LinkedIn Verification

Create `api/verify-linkedin.js` to:
- Verify LinkedIn OAuth token
- Fetch user profile (firstName, lastName, email, headline, profilePicture)
- Return user data for verification

---

### Step 3: Frontend LinkedIn OAuth Integration

Use `react-linkedin-login-oauth2` package (already installed) to:
- Add LinkedIn sign-in button on employer signup page
- Handle OAuth callback
- Get LinkedIn user data

---

### Step 4: Job Title Verification

Function already added:
```javascript
const isRecruiterRole = (jobTitle) => {
  // Checks if job title contains recruiter keywords
  // Returns true/false
}
```

**Flow:**
1. Get job title from LinkedIn (`headline` field)
2. Run `isRecruiterRole(jobTitle)`
3. If false: Show error message and block signup
4. If true: Continue to domain verification

---

### Step 5: Domain Locking System

**Check if company exists:**
```javascript
const emailDomain = getEmailDomain(userEmail);
const existingCompany = await db.collection('companies')
  .where('emailDomain', '==', emailDomain)
  .get();
```

**Flow:**
- If company exists: Show "Request Access" modal
- If company doesn't exist: Create new company account (first user becomes admin)

---

### Step 6: Request Access Flow

**When company exists:**
1. Show modal with company admin info
2. User clicks "Request Access"
3. Create `accessRequest` document in Firestore:
   - companyId
   - requestedBy (userId)
   - requestedByEmail
   - requestedByName
   - requestedByLinkedIn (profile URL)
   - jobTitle
   - status: 'pending'
   - createdAt

4. Send email to all admins (via API endpoint or email service)
5. Show confirmation to requester

---

### Step 7: Admin Approval Interface

**In Employer Dashboard:**
- Add "Team Requests" section
- List pending requests with:
  - Name, Email, LinkedIn profile, Job Title
  - [Approve] [Deny] buttons

**On Approve:**
- Add user to `companyMembers` collection
- Update `accessRequest` status to 'approved'
- Send welcome email

**On Deny:**
- Update `accessRequest` status to 'denied'
- Send rejection email

---

### Step 8: Email Notifications

**When access request received:**
- Subject: "Access Request for [Company] Employer Account"
- Body includes: Name, Email, LinkedIn URL, Job Title
- Links to approve/deny in dashboard

**When access approved:**
- Welcome email with dashboard link

**When access denied:**
- Rejection email with admin contact info

---

### Step 9: Error Messages

**Job Title Verification Failed:**
```
Your LinkedIn shows you're a [Job Title] at [Company].

This platform is for recruiting and HR teams only.

✅ If you're in recruiting: Update your LinkedIn title to include 'Recruiter', 'Talent Acquisition', or 'HR'
✅ If you're not in recruiting: Have your recruiting team sign up instead

Questions? support@partnerships-careers.com
```

**Company Already Exists:**
```
[Company] already has an employer account!

Your recruiting team is already here. Request access to join them.

Admin: [Name] ([Email])

[Request Access Button]
```

---

### Step 10: Super Admin Panel

**For admin account only (`themike423@gmail.com`):**
- View all companies
- View all access requests
- Transfer company ownership
- Flag suspicious accounts
- View verification failures

**Auto-alerts:**
- Multiple failed verification attempts from same company
- Access request pending >7 days
- Suspicious activity patterns

---

## Database Schema

### New Collections:

**accessRequests:**
```javascript
{
  id: string,
  companyId: string,
  requestedBy: string (userId),
  requestedByEmail: string,
  requestedByName: string,
  requestedByLinkedIn: string (profile URL),
  jobTitle: string,
  status: 'pending' | 'approved' | 'denied',
  createdAt: timestamp,
  respondedAt: timestamp (optional),
  respondedBy: string (userId, optional)
}
```

**companies** (updated):
```javascript
{
  id: string,
  name: string,
  emailDomain: string,
  claimedAt: timestamp,
  claimedBy: string (userId),
  // ... existing fields
}
```

**companyMembers** (existing - no changes needed)

---

## Testing Checklist

- [ ] LinkedIn OAuth works
- [ ] Job title verification works (test with "Engineer" → rejected)
- [ ] Job title verification works (test with "Recruiter" → approved)
- [ ] Domain locking works (second person from domain sees request flow)
- [ ] Email notifications sent to admins
- [ ] Admin can approve/deny in dashboard
- [ ] Approved users can access account
- [ ] Payment required before posting (already done)
- [ ] Error messages are clear and helpful
- [ ] Mobile responsive

---

## Migration Notes

**For existing employers:**
- They can continue using email/password login
- Only NEW signups require LinkedIn
- Existing accounts unaffected

**Phase out email/password (optional future step):**
- Add migration prompt for existing users to link LinkedIn
- Eventually make LinkedIn mandatory for all employers

---

## Next Steps

1. Get LinkedIn app credentials
2. Add environment variables
3. Create API endpoint for LinkedIn verification
4. Implement LinkedIn OAuth button
5. Add verification flows
6. Build admin approval interface
7. Test complete flow

