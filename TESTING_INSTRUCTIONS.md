# Testing Instructions - LinkedIn Verification System

## 🧪 Quick Test Guide

### Test 1: LinkedIn Sign-In (New Company)
1. Go to employer login page
2. Click "Sign Up"
3. Click "Sign Up with LinkedIn" (blue button)
4. Sign in with LinkedIn
5. ✅ Should verify your job title
6. ✅ Should create account and log you in
7. ✅ You should see employer dashboard

### Test 2: Job Title Verification (Should Reject)
1. Use a LinkedIn account with job title like "Software Engineer" or "Product Manager"
2. Try to sign up with LinkedIn
3. ✅ Should show error message about recruiter-only platform
4. ✅ Should block signup

### Test 3: Job Title Verification (Should Accept)
1. Use a LinkedIn account with job title like:
   - "Recruiter"
   - "Talent Acquisition"
   - "HR Manager"
   - "People Operations"
2. Try to sign up with LinkedIn
3. ✅ Should allow signup
4. ✅ Should create account

### Test 4: Domain Locking (Request Access)
1. Sign up with email from company A (e.g., `test1@company.com`) using LinkedIn
2. Create company account (you become admin)
3. Sign out
4. Sign up with different email from same company (e.g., `test2@company.com`) using LinkedIn
5. ✅ Should show "Request Access" modal
6. ✅ Should show company admin info
7. Click "Request Access"
8. ✅ Should create access request

### Test 5: Admin Approval (In Dashboard)
1. As admin, log into employer dashboard
2. Look for "Team Requests" section at the top
3. Should see pending access request(s)
4. Shows: Name, Email, LinkedIn URL, Job Title
5. Click "Approve" on a request
6. ✅ User should be added to company members
7. ✅ Request should disappear from list
8. ✅ Approved user can now access dashboard

---

## 🔍 What to Check

### LinkedIn Button:
- [ ] Button appears on employer signup page
- [ ] Button is blue with LinkedIn logo
- [ ] Button says "Sign Up with LinkedIn"
- [ ] Button works (redirects to LinkedIn)

### Job Title Verification:
- [ ] Non-recruiter job titles are rejected
- [ ] Recruiter job titles are accepted
- [ ] Error message is clear and helpful

### Domain Locking:
- [ ] First person from domain creates company
- [ ] Second person from same domain sees request flow
- [ ] Request access modal shows correct info

### Admin Approval:
- [ ] "Team Requests" section appears for admins
- [ ] Pending requests are listed
- [ ] Approve button works
- [ ] Deny button works
- [ ] Approved users are added to team

### Account Creation:
- [ ] LinkedIn signup creates Firebase account
- [ ] Company account is created automatically
- [ ] First user becomes admin
- [ ] User is logged in after signup

---

## 🐛 Common Issues

### LinkedIn button doesn't appear
- **Check:** Make sure you're on the "Sign Up" tab (not "Log In")
- **Fix:** Click "Sign Up" to switch to signup form

### "LinkedIn integration not configured"
- **Check:** Make sure credentials are in `.env` file
- **Fix:** Add `VITE_LINKEDIN_CLIENT_ID` to `.env`

### LinkedIn redirect doesn't work
- **Check:** Redirect URL in LinkedIn app settings
- **Fix:** Make sure URL matches exactly: `http://localhost:3000/auth/linkedin/callback`

### Job title verification always fails
- **Check:** LinkedIn headline field
- **Fix:** Make sure LinkedIn profile has a headline/job title

### Request access modal doesn't show
- **Check:** Console for errors
- **Fix:** Make sure company exists in Firestore

### Admin can't see access requests
- **Check:** Admin status in Firestore
- **Fix:** Make sure user's `isAdmin` field is `true`

---

## ✅ Success Criteria

The system is working if:
- ✅ LinkedIn sign-in button appears and works
- ✅ Job title verification blocks non-recruiters
- ✅ Job title verification allows recruiters
- ✅ Domain locking prevents duplicate companies
- ✅ Request access flow works
- ✅ Admin approval works
- ✅ Approved users can access dashboard

---

**Everything is ready to test! Good luck! 🚀**

