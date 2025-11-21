import { useState, useEffect, useMemo, useRef } from 'react';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, collection, getDocs, addDoc, query, where, auth, googleProvider, microsoftProvider } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
const LEVELS = ['Manager', 'Director', 'VP', 'Chief'];
const CATEGORIES = [
  'Channel & Reseller',
  'Technology & ISV',
  'Strategic Alliances',
  'Ecosystem & Marketplace',
  'Distribution & OEM',
  'Agency & Services'
];

const REGIONS = [
  'NAmer',
  'APAC',
  'EMEA',
  'LATAM',
  'Global'
];

// Utility Functions
// Fetch company logo automatically
const fetchCompanyLogo = async (companyName) => {
    if (!companyName || companyName.trim() === '') {
        return '';
    }

    try {
        const normalizedName = companyName.toLowerCase().trim();
        
        // Special handling for admin accounts - use PC logo
        // Be more flexible with matching to catch variations like "Admin PartnershipsCareers2"
        const isAdminAccount = normalizedName.includes('admin') && (
            normalizedName.includes('1255') || 
            normalizedName.includes('partnerships') || 
            normalizedName.includes('careers')
        );
        if (isAdminAccount) {
            return '/logo-icon.svg';
        }
        
        // Special handling for TD Synnex Spain - treat same as TD Synnex
        if (normalizedName.includes('td synnex') || normalizedName.includes('tdsynnex') || normalizedName.includes('synnex spain')) {
            // Use Google favicon service for TD Synnex with higher resolution
            return 'https://www.google.com/s2/favicons?domain=tdsynnex.com&sz=256';
        }
        
        // Special handling for Confluent - use high-res logo from their website
        if (normalizedName.includes('confluent')) {
            // Use Confluent's actual logo from their website (high resolution)
            return 'https://www.confluent.io/wp-content/themes/confluent/assets/images/logo/confluent-logo.svg';
        }
        
        // Special handling for Elastic - use high-res logo
        if (normalizedName.includes('elastic')) {
            // Use Elastic's actual logo from their website (high resolution)
            return 'https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/blt280217a63b82a029/6202d3378b1f312528798412/logo-elastic.svg';
        }
        
        // Special handling for Databricks - use high-res logo
        if (normalizedName.includes('databricks')) {
            // Use Databricks' actual logo from their website (high resolution)
            return 'https://www.databricks.com/wp-content/uploads/2020/09/databricks-logo.svg';
        }
        
        // Clean company name - remove common suffixes and extra spaces
        const cleanName = companyName
            .trim()
            .replace(/\s+(Inc|LLC|Ltd|Corp|Corporation|Company|Co)\.?$/i, '')
            .replace(/\s+/g, ' ');

        // Generate possible domain variations
        const baseName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const hyphenName = cleanName.toLowerCase().replace(/\s+/g, '-');
        const spaceName = cleanName.toLowerCase().replace(/\s+/g, '');
        
        // Use Google's favicon service (free, no account required, reliable)
        // Try different domain variations to find the best match
        const domainVariations = [
            baseName,
            hyphenName,
            spaceName,
            baseName.replace(/-/g, ''),
            hyphenName.replace(/-/g, '')
        ];

        // Try Google favicon service with different domain variations
        for (const domain of domainVariations) {
            if (!domain) continue;
            
            // Google favicon service - use higher resolution (256 instead of 128) for better quality
            const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}.com&sz=256`;
            // Google's service is reliable, so we can return it directly
            // Try the most likely domain first (baseName)
            if (domain === baseName) {
                return googleFaviconUrl;
            }
        }

        // Fallback: Use Google's favicon service with higher resolution for better quality
        const fallbackDomain = baseName || spaceName || cleanName.toLowerCase().replace(/\s+/g, '');
        if (fallbackDomain) {
            return `https://www.google.com/s2/favicons?domain=${fallbackDomain}.com&sz=256`;
        }

        return '';
    } catch (error) {
        console.error('Error fetching company logo:', error);
        // Return empty string if all methods fail
        return '';
    }
};

const trackLearnMore = async (jobId, db) => {
    try {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
            // Update directly in Firestore for local development
            const jobRef = doc(db, 'jobs', jobId);
            const jobDoc = await getDoc(jobRef);
            if (jobDoc.exists()) {
                const currentLearnMoreClicks = jobDoc.data().learnMoreClicks || 0;
                await updateDoc(jobRef, {
                    learnMoreClicks: currentLearnMoreClicks + 1
                });
            }
        } else {
            // Use API in production
            await fetch('/api/track-learn-more', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: jobId })
            });
        }
    } catch (error) {
        console.error('Error tracking learn more:', error);
    }
};

const trackJobClick = async (jobId, jobUrl, db) => {
    try {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
            // Update directly in Firestore for local development
            const jobRef = doc(db, 'jobs', jobId);
            const jobDoc = await getDoc(jobRef);
            if (jobDoc.exists()) {
                const currentClicks = jobDoc.data().totalClicks || 0;
                await updateDoc(jobRef, {
                    totalClicks: currentClicks + 1
                });
            }
        } else {
            // Use API in production
            await fetch('/api/track-click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId: jobId })
            });
        }
        setTimeout(() => {
            window.open(jobUrl, '_blank');
        }, 100);
    } catch (error) {
        console.error('Error tracking click:', error);
        window.open(jobUrl, '_blank');
    }
};

const calculateDaysRemaining = (expiryDateString) => {
    if (!expiryDateString) return null;
    try {
        // Handle both ISO string and formatted date strings
        const expiry = expiryDateString instanceof Date ? expiryDateString : new Date(expiryDateString);
        const today = new Date();
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    } catch (error) {
        return null;
    }
};

// Helper: Extract company name from email domain
const extractCompanyFromEmail = (email) => {
    if (!email) return null;
    const domain = email.split('@')[1];
    if (!domain) return null;
    
    // Remove common TLDs and get the main domain part
    // e.g., "company.com" -> "Company", "subdomain.company.co.uk" -> "Company"
    const domainParts = domain.toLowerCase().split('.');
    
    // Remove TLDs (com, co, uk, io, etc.) and get the main company name
    // Usually the second-to-last or third-to-last part is the company name
    let companyName = '';
    if (domainParts.length >= 2) {
        // For domains like "company.com" or "company.co.uk"
        // Take the part before the TLD
        const mainPart = domainParts[domainParts.length - 2];
        // Handle cases like "co.uk" where we need to go back further
        if (mainPart === 'co' && domainParts.length >= 3) {
            companyName = domainParts[domainParts.length - 3];
        } else {
            companyName = mainPart;
        }
    } else {
        companyName = domainParts[0];
    }
    
    // Capitalize first letter
    return companyName.charAt(0).toUpperCase() + companyName.slice(1);
};

// Helper: Extract email domain for company matching
const getEmailDomain = (email) => {
    if (!email) return null;
    const domain = email.split('@')[1];
    return domain ? domain.toLowerCase() : null;
};

// Helper: Create slug from company name
const createSlug = (name) => {
    return name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

// Helper: Normalize company name for deduplication (removes whitespace, converts to lowercase)
const normalizeCompanyName = (name) => {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/\s+/g, '') // Remove all whitespace
        .trim();
};

// Helper: Check if job title indicates recruiter/HR role
const isRecruiterRole = (jobTitle) => {
    if (!jobTitle) return false;
    
    const recruiterKeywords = [
        'recruiter', 'talent', 'acquisition', 'hiring', 
        'people ops', 'hr', 'human resources', 'staffing',
        'talent partner', 'sourcer', 'head of talent',
        'talent acquisition', 'recruiting', 'recruitment',
        'people operations', 'people team', 'talent management',
        'talent development', 'employee relations', 'people & culture',
        'talent ops', 'people ops', 'talent coordinator'
    ];
    
    const titleLower = jobTitle.toLowerCase();
    return recruiterKeywords.some(keyword => titleLower.includes(keyword));
};

// Helper: Check if email is a personal email domain
const isPersonalEmailDomain = (email) => {
    if (!email) return false;
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    
    const personalDomains = [
        'gmail.com',
        'yahoo.com',
        'hotmail.com',
        'outlook.com',
        'icloud.com',
        'mail.com',
        'protonmail.com',
        'aol.com',
        'live.com',
        'msn.com',
        'ymail.com',
        'zoho.com'
    ];
    
    return personalDomains.includes(domain);
};

// Helper: Check if email is whitelisted admin
const isWhitelistedAdmin = (email) => {
    if (!email) return false;
    const emailLower = email.toLowerCase();
    // Check for specific email
    if (emailLower === 'themike423@gmail.com') return true;
    // Check for @consultant.com domain
    if (emailLower.endsWith('@consultant.com')) return true;
    return false;
};

// Initialize Stripe (will use publishable key from env or placeholder)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

// Payment Form Component
function PaymentForm({ clientSecret, onSuccess, onCancel, isProcessing, setIsProcessing }) {
    const stripe = useStripe();
    const elements = useElements();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.href,
            },
            redirect: 'if_required',
        });

        if (error) {
            alert(`Payment failed: ${error.message}`);
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onSuccess(paymentIntent.id);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            <div className="flex gap-4 mt-6">
                <button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="flex-1 bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                    {isProcessing ? 'Processing...' : 'Pay $99 and Post Job'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isProcessing}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors duration-200 disabled:opacity-50"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

// Subscription Payment Form Component for Realtime Alerts
function SubscriptionPaymentForm({ clientSecret, onSuccess, onCancel, isProcessing, setIsProcessing }) {
    const stripe = useStripe();
    const elements = useElements();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);

        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.href,
                },
                redirect: 'if_required',
            });

            if (error) {
                // Handle specific error types
                if (error.type === 'card_error' && error.payment_intent) {
                    // Payment requires additional authentication (3DS)
                    const { error: actionError } = await stripe.handleCardAction(error.payment_intent.client_secret);
                    if (actionError) {
                        alert(`Payment authentication failed: ${actionError.message}`);
                        setIsProcessing(false);
                        return;
                    }
                    // Retry confirmation after handling 3DS
                    const { error: retryError, paymentIntent: retryPaymentIntent } = await stripe.confirmPayment({
                        elements,
                        confirmParams: {
                            return_url: window.location.href,
                        },
                        redirect: 'if_required',
                    });
                    if (retryError) {
                        alert(`Payment failed: ${retryError.message}`);
                        setIsProcessing(false);
                    } else if (retryPaymentIntent && (retryPaymentIntent.status === 'succeeded' || retryPaymentIntent.status === 'processing')) {
                        onSuccess(retryPaymentIntent.id);
                    }
                } else {
                    alert(`Payment failed: ${error.message}`);
                    setIsProcessing(false);
                }
            } else if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
                onSuccess(paymentIntent.id);
            }
        } catch (err) {
            console.error('Payment confirmation error:', err);
            alert(`Payment failed: ${err.message || 'An unexpected error occurred'}`);
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <PaymentElement 
                    options={{
                        layout: {
                            type: 'tabs',
                            defaultCollapsed: false
                        },
                        paymentMethodOrder: ['card', 'link'],
                        wallets: {
                            applePay: 'never',
                            googlePay: 'never'
                        },
                        fields: {
                            billingDetails: 'never' // Hide billing details for cleaner UI
                        },
                        // Ensure card input is always available and visible
                        business: {
                            name: 'Partnerships Careers'
                        }
                    }}
                />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="flex-1 bg-indigo-600 dark:bg-indigo-500 text-white py-2.5 sm:py-2 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm sm:text-base"
                >
                    {isProcessing ? 'Processing...' : (
                        <span>
                            <span className="hidden sm:inline">Subscribe for $5/month</span>
                            <span className="sm:hidden">Subscribe $5/mo</span>
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isProcessing}
                    className="px-4 py-2.5 sm:py-2 border border-white/30 dark:border-gray-600 rounded-lg hover:bg-white/10 dark:hover:bg-gray-700 text-white dark:text-gray-300 transition-colors duration-200 disabled:opacity-50 text-sm sm:text-base"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

function App() {
    // Firebase Auth state
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    
    // Firebase Auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setIsLoading(false);
            if (firebaseUser) {
                // Map Firebase user to match Auth0 user structure
                setUser({
                    email: firebaseUser.email,
                    name: firebaseUser.displayName,
                    sub: firebaseUser.uid, // Use uid as sub for compatibility
                    uid: firebaseUser.uid,
                    picture: firebaseUser.photoURL
                });
                setIsAuthenticated(true);
                setAuthError(null);
                console.log('✅ Firebase user authenticated:', firebaseUser.email, 'ID:', firebaseUser.uid);
            } else {
                setUser(null);
                setIsAuthenticated(false);
                console.log('👤 User signed out');
            }
        }, (error) => {
            console.error('❌ Firebase Auth Error:', error);
            setAuthError(error);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, []);
    
    // Login function with email and password
    const handleLogin = async (email, password) => {
        try {
            if (!email || !email.trim()) {
                alert('Please enter your email address');
                return;
            }
            
            if (!password || !password.trim()) {
                alert('Please enter your password');
                return;
            }
            
            console.log('Logging in with email:', email);
            await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (error) {
            console.error('Login error:', error);
            setAuthError(error);
            
            let errorMessage = 'Login error: ';
            if (error.code === 'auth/user-not-found') {
                errorMessage += 'No account found with this email address.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage += 'Incorrect password. Please try again or use "Forgot Password" to reset it.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage += 'Please enter a valid email address.';
            } else if (error.code === 'auth/user-disabled') {
                errorMessage += 'This account has been disabled.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage += 'Too many failed login attempts. Please try again later or reset your password.';
            } else {
                errorMessage += error.message || 'Unknown error';
            }
            
            alert(errorMessage);
        }
    };
    
    // Logout function
    const handleLogout = async () => {
        try {
            await signOut(auth);
            setIsEmployerLoggedIn(false);
            setCompanyData(null);
            setCompanyMembers([]);
            setEmployerFirstName('');
            setEmployerCompany('');
            setShowJobForm(false);
            setShowDashboard(false);
            setShowEmployerLogin(false);
            localStorage.removeItem('showDashboard');
        } catch (error) {
            console.error('Logout error:', error);
            // Even on error, clear the state
            setIsEmployerLoggedIn(false);
            setShowDashboard(false);
            setShowEmployerLogin(false);
            localStorage.removeItem('showDashboard');
        }
    };
    
    // Alias for compatibility
    const loginWithRedirect = handleLogin;
    const loginWithPopup = handleLogin;
    const logout = handleLogout;
    
    const [jobs, setJobs] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedRegion, setSelectedRegion] = useState('All');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showEmployerLogin, setShowEmployerLogin] = useState(false);
    // Restore dashboard state from localStorage on initial load
    const [showDashboard, setShowDashboard] = useState(() => {
        const saved = localStorage.getItem('showDashboard');
        return saved === 'true';
    });
    
    // Dark mode state with localStorage persistence
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        const isDark = saved === 'true';
        // Apply class immediately to html element (Tailwind requires it on html)
        const html = document.documentElement;
        if (isDark) {
            html.classList.add('dark');
            console.log('🌙 Initial dark mode: ON. HTML classes:', html.className);
        } else {
            html.classList.remove('dark');
            console.log('☀️ Initial dark mode: OFF. HTML classes:', html.className);
        }
        return isDark;
    });
    
    // Sync dark mode class with state changes - CRITICAL: This must run on every state change
    useEffect(() => {
        const html = document.documentElement;
        console.log('🔄 useEffect: isDarkMode =', isDarkMode);
        
        // CRITICAL: Tailwind requires the 'dark' class on the html element
        // Remove first to ensure clean state
        html.classList.remove('dark');
        
        if (isDarkMode) {
            html.classList.add('dark');
            console.log('✅ DARK MODE ON - Added dark class. HTML classes:', html.className);
        } else {
            console.log('✅ DARK MODE OFF - Removed dark class. HTML classes:', html.className);
        }
        
        localStorage.setItem('darkMode', isDarkMode.toString());
        
        // Verify the class is actually on the element
        console.log('🔍 Verification - HTML has dark class?', html.classList.contains('dark'));
    }, [isDarkMode]);
    
    // Toggle dark mode function - simple and direct
    const toggleDarkMode = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const newValue = !isDarkMode;
        console.log('🔄 TOGGLE: Changing from', isDarkMode, 'to', newValue);
        setIsDarkMode(newValue);
    };
    const [isSignUp, setIsSignUp] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [email, setEmail] = useState('');
    const [alertFrequency, setAlertFrequency] = useState('weekly'); // daily, weekly, or realtime
    const [alertSubmitting, setAlertSubmitting] = useState(false);
    const [showRealtimeCheckout, setShowRealtimeCheckout] = useState(false);
    const [realtimeClientSecret, setRealtimeClientSecret] = useState(null);
    const [realtimeSubscriptionId, setRealtimeSubscriptionId] = useState(null);
    const signupButtonRef = useRef(null);
    const [isEmployerLoggedIn, setIsEmployerLoggedIn] = useState(false);
    const [employerCompany, setEmployerCompany] = useState('');
    const [employerFirstName, setEmployerFirstName] = useState('');
    const [authLoading, setAuthLoading] = useState(true);
    const [companyData, setCompanyData] = useState(null);
    const [companyMembers, setCompanyMembers] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false); // Track if current user is admin
    const [selectedJobs, setSelectedJobs] = useState([]);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [showCompanyPage, setShowCompanyPage] = useState(false);
    const [showCompaniesPage, setShowCompaniesPage] = useState(false);
    const [allCompanies, setAllCompanies] = useState([]);
    const [companiesLoading, setCompaniesLoading] = useState(false);
    const [expandedCompanyId, setExpandedCompanyId] = useState(null);
    const [companySummaries, setCompanySummaries] = useState({});

    // Generate company overview (what they do and partnership focus)
    const generateCompanyOverview = async (companyName, companyJobs) => {
        const companyKey = companyName.toLowerCase();
        
        // Check if already generated
        if (companySummaries[companyKey]) {
            return companySummaries[companyKey];
        }

        // Check if stored in company document
        try {
            const companiesRef = collection(db, 'companies');
            const companiesSnapshot = await getDocs(companiesRef);
            let companyDoc = null;
            companiesSnapshot.forEach((docSnapshot) => {
                const companyData = docSnapshot.data();
                if (companyData.name?.toLowerCase() === companyKey) {
                    companyDoc = { id: docSnapshot.id, ...companyData };
                }
            });
            
            if (companyDoc?.companyOverview) {
                setCompanySummaries(prev => ({ ...prev, [companyKey]: companyDoc.companyOverview }));
                return companyDoc.companyOverview;
            }
        } catch (error) {
            console.error('Error fetching company overview:', error);
        }

        // Generate overview based on company's jobs
        let overview = '';
        if (companyJobs && companyJobs.length > 0) {
            const categories = [...new Set(companyJobs.map(j => j.category).filter(Boolean))];
            const regions = [...new Set(companyJobs.map(j => j.region).filter(Boolean))];
            
            const categoryDesc = {
                'Channel & Reseller': 'channel and reseller partnerships',
                'Technology & ISV': 'technology integrations and ISV partnerships',
                'Strategic Alliances': 'strategic alliances and enterprise partnerships',
                'Ecosystem & Marketplace': 'ecosystem development and marketplace programs',
                'Distribution & OEM': 'distribution channels and OEM partnerships',
                'Agency & Services': 'agency relationships and service partnerships'
            };
            
            const primaryCategory = categories[0] || 'partnerships';
            const categoryText = categoryDesc[primaryCategory] || primaryCategory.toLowerCase();
            
            overview = `${companyName} is a leading organization focused on ${categoryText}. `;
            
            if (categories.length > 1) {
                overview += `The company engages across multiple partnership types including ${categories.slice(1, 3).map(c => categoryDesc[c] || c.toLowerCase()).join(', ')}. `;
            }
            
            if (regions.length > 0) {
                const regionText = regions.length === 1 ? regions[0] : 'global markets';
                overview += `Their partnership strategy spans ${regionText}, working with strategic partners to deliver innovative solutions and drive mutual growth. `;
            } else {
                overview += `The company works closely with partners to deliver innovative solutions and drive mutual success through strategic collaboration and relationship building. `;
            }
            
            overview += `Their partnership focus centers on building long-term, value-driven relationships that create win-win outcomes for both the company and its partners.`;
        } else {
            overview = `${companyName} is a forward-thinking organization focused on building strategic partnerships. The company works closely with partners to deliver innovative solutions and drive mutual success in the market through collaborative relationships. Their partnership focus centers on creating value-driven alliances that benefit all stakeholders.`;
        }

        // Store in company document if it exists
        try {
            const companiesRef = collection(db, 'companies');
            const companiesSnapshot = await getDocs(companiesRef);
            companiesSnapshot.forEach(async (docSnapshot) => {
                const companyData = docSnapshot.data();
                if (companyData.name?.toLowerCase() === companyKey) {
                    const companyRef = doc(db, 'companies', docSnapshot.id);
                    await updateDoc(companyRef, { companyOverview: overview });
                }
            });
        } catch (error) {
            console.error('Error saving company overview:', error);
        }

        setCompanySummaries(prev => ({ ...prev, [companyKey]: overview }));
        return overview;
    };
    const [showJobForm, setShowJobForm] = useState(false);
    const [linkedinAuthLoading, setLinkedinAuthLoading] = useState(false);
    const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
    const [existingCompanyInfo, setExistingCompanyInfo] = useState(null);
    const [pendingAccessRequests, setPendingAccessRequests] = useState([]);
    const [linkedinUserData, setLinkedinUserData] = useState(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentClientSecret, setPaymentClientSecret] = useState(null);
    const [paymentIntentId, setPaymentIntentId] = useState(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [pendingJobData, setPendingJobData] = useState(null);
    const [expandedJobs, setExpandedJobs] = useState([]);
    const [jobSummaries, setJobSummaries] = useState({});
    const [companyFastFacts, setCompanyFastFacts] = useState({});
    const [appError, setAppError] = useState(null);
    const [newJobData, setNewJobData] = useState({
        title: '',
        company: '',
        location: '',
        type: 'Full-Time',
        level: 'Manager',
        category: 'Channel & Reseller',
        region: 'NAmer',
        description: '',
        link: '',
        salaryRange: '',
        companyLogo: '',
        companyStage: '',
        companySize: '',
        isRemote: false,
        hasEquity: false,
        hasVisa: false
    });

    // Track if we just processed a redirect to show dashboard
    const justProcessedRedirect = useRef(false);
    
    useEffect(() => {
        // Initialize Lucide icons after component mounts
        const initIcons = () => {
            if (window.lucide) {
                window.lucide.createIcons();
            }
        };
        
        // Initialize on mount and after state updates
        initIcons();
        const interval = setInterval(initIcons, 100);
        
        const loadData = async () => {
            try {
                await fetchJobs();
            } catch (error) {
                console.error('Error in useEffect:', error);
                setError('Failed to load application. Please refresh the page.');
            }
        };
        loadData();
        
        // Check for payment success/cancel in URL
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        const paymentType = urlParams.get('type');
        const alertSubscription = urlParams.get('alert_subscription');
        const alertId = urlParams.get('alert_id');
        
        if (alertSubscription === 'success') {
            alert('🎉 Payment successful! Your realtime job alerts subscription is now active. You\'ll receive instant notifications when new jobs are posted.');
            setEmail('');
            setAlertFrequency('weekly');
            setShowRealtimeCheckout(false);
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (alertSubscription === 'cancelled') {
            alert('Checkout was cancelled. You can try again anytime.');
            setShowRealtimeCheckout(false);
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (paymentStatus === 'success') {
            if (paymentType === 'new') {
                setShowJobForm(true);
                setShowDashboard(true);
                alert('🎉 Payment successful! Please fill out the form below to post your featured job.');
            } else {
                alert('🎉 Payment successful! Your job listing is now featured for 30 days.');
                setShowDashboard(true);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (paymentStatus === 'cancelled') {
            alert('Payment was cancelled.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        return () => {
            clearInterval(interval);
        };
    }, []);

    // Force button color - directly manipulate DOM to override any CSS
    useEffect(() => {
        if (signupButtonRef.current) {
            const btn = signupButtonRef.current;
            btn.style.setProperty('background-color', '#f59e0b', 'important');
            btn.style.setProperty('color', '#ffffff', 'important');
            btn.style.setProperty('border', 'none', 'important');
            btn.style.setProperty('opacity', (!email || alertSubmitting) ? '0.5' : '1', 'important');
            btn.style.setProperty('isolation', 'isolate', 'important');
            btn.style.setProperty('z-index', '10000', 'important');
            btn.style.setProperty('position', 'relative', 'important');
        }
    }, [email, alertSubmitting]);

    // Auto-show checkout expander when realtime is selected and email is valid
    useEffect(() => {
        if (alertFrequency === 'realtime' && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setShowRealtimeCheckout(true);
        } else if (alertFrequency !== 'realtime') {
            setShowRealtimeCheckout(false);
        }
    }, [alertFrequency, email]);
    
    // Handle Firebase authentication state - separate useEffect
    useEffect(() => {
            console.log('🔄 Auth state changed - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user?.email);
            if (authError) {
                console.error('❌ Firebase Auth Error:', authError);
            }
            
            // Update auth loading state
            if (isLoading !== authLoading) {
                setAuthLoading(isLoading);
            }
            
            if (isLoading) {
                console.log('⏳ Firebase Auth is loading...');
                return;
            }
            
            // Restore dashboard state from localStorage if user is authenticated
            if (isAuthenticated && user) {
                const savedDashboard = localStorage.getItem('showDashboard');
                if (savedDashboard === 'true' && !showDashboard) {
                    console.log('📊 Restoring dashboard state from localStorage for authenticated user');
                    setShowDashboard(true);
                    setIsEmployerLoggedIn(true);
                }
            }
            
            if (isAuthenticated && user) {
                console.log('✅ Firebase user authenticated:', user.email, 'ID:', user.uid);
                console.log('🔍 Checking if user should see dashboard...');
                
                // Check whitelist status and log it prominently
                const whitelistStatus = isWhitelistedAdmin(user.email);
                if (whitelistStatus) {
                    console.log('🔐 ⭐ WHITELISTED ADMIN DETECTED ⭐ Email:', user.email);
                } else {
                    console.log('🔐 Email NOT whitelisted:', user.email);
                    console.log('💡 If you expected this email to be whitelisted, check:');
                    console.log('   - Is the email exactly:', user.email);
                    console.log('   - Does it end with @consultant.com?');
                }
                
                // Validate email - must be corporate unless whitelisted
                if (!isWhitelistedAdmin(user.email) && isPersonalEmailDomain(user.email)) {
                    alert('Please use your corporate or company email address to sign in. Personal email addresses (Gmail, Yahoo, etc.) are not allowed.');
                    handleLogout();
                    return;
                }
                
                // Immediately show dashboard for authenticated users (before loading company data)
                setIsEmployerLoggedIn(true);
                setShowEmployerLogin(false);
                setShowDashboard(true);
                localStorage.setItem('showDashboard', 'true');
                console.log('📊 Dashboard shown immediately for authenticated user');
                
                // Extract name from user object immediately
                if (user.name) {
                    const nameParts = user.name.split(' ');
                    setEmployerFirstName(nameParts[0] || 'there');
                } else if (user.email) {
                    const emailName = user.email.split('@')[0];
                    setEmployerFirstName(emailName.split('.')[0] || 'there');
                }
                
                // Use Firebase uid as userId
                const userId = user.uid || user.sub;
                
                // Process the sign-in (load company data in background)
                const processFirebaseUser = async () => {
                    try {
                        console.log('🔍 Processing Firebase user:', {
                            email: user.email,
                            userId: userId,
                            uid: user.uid
                        });
                        
                        // Check whitelist status FIRST and log it
                        const isWhitelisted = isWhitelistedAdmin(user.email);
                        console.log('🔐 Whitelist check for', user.email, ':', isWhitelisted);
                        
                        const membersRef = collection(db, 'companyMembers');
                        
                        // SIMPLEST SOLUTION: Only check by email - if email doesn't exist, create new account
                        // This prevents any cross-account linking issues
                        const memberQueryByEmail = query(membersRef, where('email', '==', user.email.toLowerCase()));
                        const memberSnapshotByEmail = await getDocs(memberQueryByEmail);
                        
                        let existingMember = null;
                        
                        // ONLY use existing member if email matches exactly
                        if (!memberSnapshotByEmail.empty) {
                            const memberDoc = memberSnapshotByEmail.docs[0];
                            const memberData = memberDoc.data();
                            existingMember = { id: memberDoc.id, ...memberData };
                            console.log('✅ Found existing member by email:', user.email, 'Member data:', {
                                email: memberData.email,
                                isAdmin: memberData.isAdmin,
                                companyId: memberData.companyId
                            });
                        } else {
                            console.log('🆕 New user - email not found in database:', user.email);
                        }
                        
                        if (existingMember) {
                            const memberData = existingMember;
                            const companyId = memberData.companyId;
                            
                            console.log('🏢 Loading company for existing member:', {
                                email: user.email,
                                companyId: companyId,
                                memberIsAdmin: memberData.isAdmin
                            });
                            
                            // CRITICAL: Whitelisted admins ALWAYS get admin status, regardless of member record
                            const isWhitelisted = isWhitelistedAdmin(user.email);
                            let userIsAdmin = isWhitelisted || memberData.isAdmin === true;
                            
                            console.log('🔐 Admin status check:', {
                                userEmail: user.email,
                                memberEmail: memberData.email,
                                isWhitelisted: isWhitelisted,
                                memberDataIsAdmin: memberData.isAdmin,
                                finalUserIsAdmin: userIsAdmin
                            });
                            
                            // CRITICAL: Check admin status from whitelist FIRST, then memberData
                            // This MUST happen before trying to load company data
                            if (isWhitelisted || memberData.isAdmin === true) {
                                setIsAdmin(true);
                                userIsAdmin = true;
                                console.log('✅ Admin status SET - whitelisted:', isWhitelisted, 'memberData.isAdmin:', memberData.isAdmin);
                                
                                // If whitelisted but member record doesn't reflect it, update it
                                if (isWhitelisted && memberData.isAdmin !== true) {
                                    console.log('🔄 Updating member record to set isAdmin=true for whitelisted admin');
                                    try {
                                        await updateDoc(doc(db, 'companyMembers', existingMember.id), {
                                            isAdmin: true
                                        });
                                        console.log('✅ Successfully updated member record isAdmin=true');
                                    } catch (updateError) {
                                        console.error('❌ Error updating admin status in member record:', updateError);
                                        // Even if update fails, set admin status in state
                                        setIsAdmin(true);
                                    }
                                }
                            } else {
                                // Only set to false if not whitelisted AND not admin in member data
                                if (!isWhitelisted) {
                                    setIsAdmin(false);
                                    userIsAdmin = false;
                                }
                                console.log('❌ Admin status: NOT admin - isWhitelisted:', isWhitelisted, 'memberData.isAdmin:', memberData.isAdmin);
                            }
                            
                            // Try to load company data
                            try {
                                const companyDoc = await getDoc(doc(db, 'companies', companyId));
                                if (companyDoc.exists()) {
                                    const companyDocData = companyDoc.data();
                                    
                                    // Backfill emailDomain if missing (for old companies)
                                    const userEmailDomain = getEmailDomain(user.email);
                                    if (!companyDocData.emailDomain && userEmailDomain) {
                                        console.log('⚠️ Backfilling emailDomain for company:', companyDocData.name);
                                        try {
                                            await updateDoc(doc(db, 'companies', companyId), {
                                                emailDomain: userEmailDomain
                                            });
                                            companyDocData.emailDomain = userEmailDomain;
                                        } catch (updateError) {
                                            console.error('Error backfilling emailDomain:', updateError);
                                        }
                                    }
                                    
                                    setCompanyData({ id: companyId, ...companyDocData });
                                    setEmployerCompany(companyDocData.name);
                                    
                                    // Check company admin fields as fallback
                                    if (!userIsAdmin && (companyDocData?.adminUserId === userId || companyDocData?.createdBy === userId)) {
                                        userIsAdmin = true;
                                        console.log('✅ Admin status from company admin fields');
                                        setIsAdmin(true);
                                        // Update member record to reflect admin status
                                        try {
                                            await updateDoc(doc(db, 'companyMembers', existingMember.id), {
                                                isAdmin: true
                                            });
                                            console.log('🔄 Updated member record to set isAdmin=true');
                                        } catch (updateError) {
                                            console.error('Error updating admin status:', updateError);
                                        }
                                    }
                                } else {
                                    console.warn('⚠️ Company document not found:', companyId);
                                    // Set basic company data from member record
                                    setCompanyData({ 
                                        id: companyId,
                                        name: memberData.emailDomain ? extractCompanyFromEmail(memberData.email) : 'Your Company'
                                    });
                                }
                            } catch (companyError) {
                                console.error('❌ Error loading company data:', companyError);
                                // Set basic company data even if we can't load full document
                                setCompanyData({ 
                                    id: companyId,
                                    name: extractCompanyFromEmail(user.email) || 'Your Company'
                                });
                                console.log('⚠️ Using fallback company data due to permission error');
                            }
                            
                            // Final admin status check - whitelist ALWAYS wins
                            const finalWhitelistCheck = isWhitelistedAdmin(user.email);
                            if (finalWhitelistCheck) {
                                userIsAdmin = true;
                                setIsAdmin(true);
                                console.log('🔐 FINAL: Whitelisted admin detected - forcing admin status');
                                
                                // Force update member record if whitelisted
                                if (memberData.isAdmin !== true) {
                                    try {
                                        await updateDoc(doc(db, 'companyMembers', existingMember.id), {
                                            isAdmin: true
                                        });
                                        console.log('✅ Force-updated member record isAdmin=true for whitelisted admin');
                                    } catch (updateError) {
                                        console.error('❌ Error force-updating admin status:', updateError);
                                    }
                                }
                            } else if (!userIsAdmin) {
                                setIsAdmin(false);
                            }
                            
                            console.log('👤 FINAL ADMIN STATUS:', {
                                userEmail: user.email,
                                memberEmail: memberData.email,
                                userIsAdmin: userIsAdmin,
                                isAdminState: isAdmin,
                                fromMemberData: memberData.isAdmin === true,
                                fromWhitelist: finalWhitelistCheck,
                                userId: userId,
                                companyId: companyId
                            });
                            
                            setEmployerFirstName(memberData.firstName || 'there');
                            
                            const allMembersQuery = query(membersRef, where('companyId', '==', companyId));
                            const allMembersSnapshot = await getDocs(allMembersQuery);
                            const members = allMembersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                            setCompanyMembers(members);
                            
                            // Fetch pending access requests if user is admin
                            if (userIsAdmin || isWhitelistedAdmin(user.email)) {
                                try {
                                    const accessRequestsRef = collection(db, 'accessRequests');
                                    const pendingRequestsQuery = query(
                                        accessRequestsRef,
                                        where('companyId', '==', companyId),
                                        where('status', '==', 'pending')
                                    );
                                    const pendingRequestsSnapshot = await getDocs(pendingRequestsQuery);
                                    const requests = pendingRequestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                                    setPendingAccessRequests(requests);
                                } catch (requestsError) {
                                    console.error('Error fetching access requests:', requestsError);
                                }
                            }
                            
                            // Dashboard already shown above, just update company data
                            console.log('✅ Successfully loaded company data for existing user');
                            console.log('📊 Dashboard state - isEmployerLoggedIn:', true, 'showDashboard:', true);
                        } else {
                            // NEW USER - Always create new company/member record
                            console.log('🆕 Creating new account for:', user.email);
                            
                            // Get sign-up data from sessionStorage if available
                            let firstName = 'there';
                            let lastName = '';
                            let detectedCompany = extractCompanyFromEmail(user.email) || 'Your Company';
                            let website = '';
                            
                            const pendingSignUp = sessionStorage.getItem('pendingSignUp');
                            if (pendingSignUp) {
                                try {
                                    const signUpData = JSON.parse(pendingSignUp);
                                    firstName = signUpData.firstName || firstName;
                                    lastName = signUpData.lastName || '';
                                    detectedCompany = signUpData.company || detectedCompany;
                                    website = signUpData.website || '';
                                    sessionStorage.removeItem('pendingSignUp');
                                    console.log('📝 Using sign-up data from sessionStorage');
                                } catch (e) {
                                    console.warn('Failed to parse pending sign-up data:', e);
                                }
                            } else {
                                // Extract from user object
                                const nameParts = user.name ? user.name.split(' ') : (user.displayName ? user.displayName.split(' ') : []);
                                firstName = nameParts[0] || firstName;
                                lastName = nameParts.slice(1).join(' ') || '';
                            }
                            
                            // Get email domain for company matching
                            const emailDomain = getEmailDomain(user.email);
                            console.log('🏢 Email domain:', emailDomain, 'Company name:', detectedCompany);
                            
                            // Check if company already exists by email domain ONLY
                            const companiesRef = collection(db, 'companies');
                            const allCompaniesSnapshot = await getDocs(companiesRef);
                            let existingCompany = null;
                            
                            allCompaniesSnapshot.forEach((docSnapshot) => {
                                const companyData = docSnapshot.data();
                                // ONLY match by email domain - never by name
                                if (companyData.emailDomain && companyData.emailDomain === emailDomain) {
                                    existingCompany = { id: docSnapshot.id, ...companyData };
                                }
                            });
                            
                            let companyId;
                            // Check if user is whitelisted admin - they should always be admin
                            const isWhitelisted = isWhitelistedAdmin(user.email);
                            let isAdmin = false;
                            
                            if (existingCompany) {
                                // Company exists with same domain - user joins existing company
                                companyId = existingCompany.id;
                                // Whitelisted admins are always admin, even when joining existing company
                                isAdmin = isWhitelisted;
                                console.log('✅ Found existing company by domain:', existingCompany.name, '- User joins as member', isAdmin ? '(whitelisted admin)' : '');
                            } else {
                                // Create NEW company - this user becomes the admin
                                const companyLogo = await fetchCompanyLogo(detectedCompany);
                                const newCompanyRef = doc(collection(db, 'companies'));
                                companyId = newCompanyRef.id;
                                isAdmin = true; // First user is admin (or whitelisted admin)
                                
                                await setDoc(newCompanyRef, {
                                    name: detectedCompany,
                                    emailDomain: emailDomain, // Store domain for matching
                                    website: website || '',
                                    logo: companyLogo || '',
                                    industry: '',
                                    createdBy: userId,
                                    adminUserId: userId, // Store admin user ID
                                    createdAt: new Date().toISOString()
                                });
                                console.log('✅ Created NEW company:', detectedCompany, 'Domain:', emailDomain, '- User is admin', isWhitelisted ? '(whitelisted)' : '');
                            }
                            
                            // Ensure whitelisted admins are always marked as admin
                            if (isWhitelisted) {
                                isAdmin = true;
                                console.log('✅ Whitelisted admin detected - setting isAdmin=true for:', user.email);
                            }
                            
                            // Create company member record
                            try {
                                await setDoc(doc(db, 'companyMembers', `${companyId}_${userId}`), {
                                    companyId: companyId,
                                    userId: userId,
                                    email: user.email,
                                    emailDomain: emailDomain, // Store domain for validation
                                    firstName: firstName,
                                    lastName: lastName,
                                    isAdmin: isAdmin, // Mark if this user is admin
                                    joinedAt: new Date().toISOString()
                                });
                                
                                console.log('✅ Created company member record:', {
                                    email: user.email,
                                    companyId: companyId,
                                    isAdmin: isAdmin,
                                    memberId: `${companyId}_${userId}`
                                });
                            } catch (memberError) {
                                console.error('❌ CRITICAL: Failed to create company member record:', memberError);
                                console.error('This is likely a Firebase permissions issue. Check Firestore security rules.');
                                alert('Error creating account: ' + memberError.message + '\n\nPlease check Firebase security rules allow writes to companyMembers collection.');
                                throw memberError; // Re-throw to stop execution
                            }
                            
                            // Fetch company data
                            try {
                                const companyDoc = await getDoc(doc(db, 'companies', companyId));
                                if (companyDoc.exists()) {
                                    setCompanyData({ id: companyId, ...companyDoc.data() });
                                    console.log('✅ Loaded company data:', companyDoc.data().name);
                                } else {
                                    console.warn('⚠️ Company document not found:', companyId);
                                }
                            } catch (companyError) {
                                console.error('❌ Error loading company data:', companyError);
                                // Set basic company data even if we can't load full document
                                setCompanyData({ 
                                    id: companyId, 
                                    name: detectedCompany,
                                    emailDomain: emailDomain
                                });
                            }
                            
                            setEmployerFirstName(firstName);
                            setEmployerCompany(detectedCompany);
                            setIsAdmin(isAdmin); // Set admin status for new company creator
                            console.log('👤 Set admin status to:', isAdmin, 'for user:', user.email, 'companyId:', companyId);
                            
                            // Verify the member record was created correctly
                            try {
                                const verifyMemberDoc = await getDoc(doc(db, 'companyMembers', `${companyId}_${userId}`));
                                if (verifyMemberDoc.exists()) {
                                    const verifyData = verifyMemberDoc.data();
                                    console.log('✅ Verified member record:', {
                                        email: verifyData.email,
                                        isAdmin: verifyData.isAdmin,
                                        companyId: verifyData.companyId
                                    });
                                    // Ensure admin status is correct
                                    if (verifyData.isAdmin !== isAdmin) {
                                        console.warn('⚠️ Admin status mismatch! Updating member record...');
                                        await updateDoc(doc(db, 'companyMembers', `${companyId}_${userId}`), {
                                            isAdmin: isAdmin
                                        });
                                    }
                                }
                            } catch (verifyError) {
                                console.error('Error verifying member record:', verifyError);
                            }
                            
                            // Fetch company members
                            const allMembersQuery = query(membersRef, where('companyId', '==', companyId));
                            const allMembersSnapshot = await getDocs(allMembersQuery);
                            const members = allMembersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                            setCompanyMembers(members);
                            
                            // Fetch pending access requests if user is admin (for new companies, admin is true)
                            if (isAdmin || isWhitelistedAdmin(user.email)) {
                                try {
                                    const accessRequestsRef = collection(db, 'accessRequests');
                                    const pendingRequestsQuery = query(
                                        accessRequestsRef,
                                        where('companyId', '==', companyId),
                                        where('status', '==', 'pending')
                                    );
                                    const pendingRequestsSnapshot = await getDocs(pendingRequestsQuery);
                                    const requests = pendingRequestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                                    setPendingAccessRequests(requests);
                                } catch (requestsError) {
                                    console.error('Error fetching access requests:', requestsError);
                                }
                            }
                            
                            // Dashboard already shown above, just confirm state
                            console.log('✅ Successfully created company and logged in');
                            console.log('👤 User is admin:', isAdmin);
                            console.log('📊 Dashboard state - isEmployerLoggedIn:', true, 'showDashboard:', true);
                        }
                        } catch (firestoreError) {
                            console.error('Error fetching user data after Google sign-in:', firestoreError);
                            // User is authenticated but we couldn't fetch their data
                            // Dashboard already shown above, just log the error
                            console.log('⚠️ Firestore error but user is authenticated, dashboard already shown');
                            console.warn('Could not load profile data immediately, will retry');
                        }
                    };
                    
                    // Process user authentication and load company data
                    (async () => {
                        try {
                            // This is already handled in the code above
                        } catch (error) {
                            console.error('Error processing user:', error);
                        }
                    })();
                } else {
                    // User not authenticated
                    setIsEmployerLoggedIn(false);
                    setCompanyData(null);
                    setCompanyMembers([]);
                    setEmployerFirstName('');
                    setEmployerCompany('');
                    setShowDashboard(false);
                    setShowEmployerLogin(false);
                    localStorage.removeItem('showDashboard');
                }
    }, [isAuthenticated, user, isLoading, authError]);
    
    // Check for payment success/cancel in URL (separate useEffect)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        const paymentType = urlParams.get('type');
        
        if (paymentStatus === 'success') {
            if (paymentType === 'new') {
                setShowJobForm(true);
                setShowDashboard(true);
                alert('🎉 Payment successful! Please fill out the form below to post your featured job.');
            } else {
                alert('🎉 Payment successful! Your job listing is now featured for 30 days.');
                setShowDashboard(true);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (paymentStatus === 'cancelled') {
            alert('Payment was cancelled.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // Fetch all companies for companies page - cross-referenced with jobs
    const fetchAllCompanies = async () => {
        setCompaniesLoading(true);
        try {
            // Get all companies from companies collection
            const companiesRef = collection(db, 'companies');
            const companiesSnapshot = await getDocs(companiesRef);
            const companiesMap = new Map();
            
            companiesSnapshot.forEach((docSnapshot) => {
                const companyData = docSnapshot.data();
                const normalizedKey = normalizeCompanyName(companyData.name);
                // Use the original name as the canonical name, but normalize for key
                if (!companiesMap.has(normalizedKey)) {
                    companiesMap.set(normalizedKey, {
                        id: docSnapshot.id,
                        name: companyData.name || 'Unknown Company',
                        logo: companyData.logo || '',
                        website: companyData.website || '',
                        ...companyData
                    });
                } else {
                    // If duplicate found, prefer the one with more complete data
                    const existing = companiesMap.get(normalizedKey);
                    if (!existing.logo && companyData.logo) {
                        companiesMap.set(normalizedKey, {
                            ...existing,
                            logo: companyData.logo
                        });
                    }
                }
            });
            
            // Get all active jobs to cross-reference logos
            const jobsRef = collection(db, 'jobs');
            const jobsQuery = query(jobsRef, where('status', '==', 'active'));
            const jobsSnapshot = await getDocs(jobsQuery);
            
            const companyLogosMap = new Map();
            const logoUpdatePromises = [];
            
            // Extract company logos from jobs (but skip admin accounts - they should use PC logo)
            jobsSnapshot.forEach((docSnapshot) => {
                const jobData = docSnapshot.data();
                if (jobData.company && jobData.companyLogo) {
                    const companyKey = normalizeCompanyName(jobData.company);
                    const normalizedName = (jobData.company || '').toLowerCase().trim();
                    const isAdminAccount = normalizedName.includes('admin') && (
                        normalizedName.includes('1255') || 
                        normalizedName.includes('partnerships') || 
                        normalizedName.includes('careers')
                    );
                    // Don't add admin account logos from jobs - they should use PC logo
                    if (!isAdminAccount && !companyLogosMap.has(companyKey)) {
                        companyLogosMap.set(companyKey, jobData.companyLogo);
                    }
                }
            });
            
            // Merge logos from jobs into companies, and fetch missing ones
            const companiesArray = [];
            for (const [companyKey, companyData] of companiesMap.entries()) {
                let logo = companyData.logo;
                
                console.log(`Processing company: ${companyData.name}, has logo: ${!!logo}, current logo: ${logo}`);
                
                // Special handling: Check for admin accounts FIRST - ALWAYS use PC logo
                const normalizedName = (companyData.name || '').toLowerCase().trim();
                // Check for admin accounts - be more flexible with matching
                const isAdminAccount = normalizedName.includes('admin') && (
                    normalizedName.includes('1255') || 
                    normalizedName.includes('partnerships') || 
                    normalizedName.includes('careers')
                );
                if (isAdminAccount) {
                    const pcLogo = '/logo-icon.svg';
                    // FORCE PC logo regardless of what's in database
                    logo = pcLogo;
                    companyData.logo = pcLogo;
                    // Always update database to ensure it's persisted
                    if (companyData.id) {
                        const updatePromise = (async () => {
                            try {
                                const companyRef = doc(db, 'companies', companyData.id);
                                await updateDoc(companyRef, { logo: pcLogo });
                                console.log(`  → FORCED update: admin account ${companyData.name} with PC logo in database`);
                            } catch (err) {
                                console.error(`Error updating admin logo for ${companyData.id}:`, err);
                            }
                        })();
                        logoUpdatePromises.push(updatePromise);
                    }
                    console.log(`  → FORCED PC logo for admin account: ${companyData.name}`);
                } else if (normalizedName.includes('confluent')) {
                    // Special handling for Confluent - use high-res SVG logo
                    const confluentLogo = 'https://www.confluent.io/wp-content/themes/confluent/assets/images/logo/confluent-logo.svg';
                    logo = confluentLogo;
                    companyData.logo = confluentLogo;
                    // Always update database to ensure it's persisted
                    if (companyData.id) {
                        const updatePromise = (async () => {
                            try {
                                const companyRef = doc(db, 'companies', companyData.id);
                                await updateDoc(companyRef, { logo: confluentLogo });
                                console.log(`  → FORCED update: Confluent with high-res logo in database`);
                            } catch (err) {
                                console.error(`Error updating Confluent logo:`, err);
                            }
                        })();
                        logoUpdatePromises.push(updatePromise);
                    }
                    console.log(`  → FORCED Confluent high-res logo: ${companyData.name}`);
                } else if (normalizedName.includes('elastic')) {
                    // Special handling for Elastic - use high-res SVG logo
                    const elasticLogo = 'https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/blt280217a63b82a029/6202d3378b1f312528798412/logo-elastic.svg';
                    logo = elasticLogo;
                    companyData.logo = elasticLogo;
                    if (companyData.id) {
                        const updatePromise = (async () => {
                            try {
                                const companyRef = doc(db, 'companies', companyData.id);
                                await updateDoc(companyRef, { logo: elasticLogo });
                                console.log(`  → FORCED update: Elastic with high-res logo in database`);
                            } catch (err) {
                                console.error(`Error updating Elastic logo:`, err);
                            }
                        })();
                        logoUpdatePromises.push(updatePromise);
                    }
                    console.log(`  → FORCED Elastic high-res logo: ${companyData.name}`);
                } else if (normalizedName.includes('databricks')) {
                    // Special handling for Databricks - use high-res SVG logo
                    const databricksLogo = 'https://www.databricks.com/wp-content/uploads/2020/09/databricks-logo.svg';
                    logo = databricksLogo;
                    companyData.logo = databricksLogo;
                    if (companyData.id) {
                        const updatePromise = (async () => {
                            try {
                                const companyRef = doc(db, 'companies', companyData.id);
                                await updateDoc(companyRef, { logo: databricksLogo });
                                console.log(`  → FORCED update: Databricks with high-res logo in database`);
                            } catch (err) {
                                console.error(`Error updating Databricks logo:`, err);
                            }
                        })();
                        logoUpdatePromises.push(updatePromise);
                    }
                    console.log(`  → FORCED Databricks high-res logo: ${companyData.name}`);
                } else if (normalizedName.includes('td synnex') || normalizedName.includes('tdsynnex') || normalizedName.includes('synnex spain')) {
                    // Special handling for TD Synnex Spain - FORCE same logo as TD Synnex using Google favicon service
                    const synnexLogo = 'https://www.google.com/s2/favicons?domain=tdsynnex.com&sz=128';
                    // FORCE logo - always override whatever is in database
                    logo = synnexLogo;
                    companyData.logo = synnexLogo;
                    // Always update database to ensure it's persisted
                    if (companyData.id) {
                        const updatePromise = (async () => {
                            try {
                                const companyRef = doc(db, 'companies', companyData.id);
                                await updateDoc(companyRef, { logo: synnexLogo });
                                console.log(`  → FORCED update: TD Synnex with logo in database`);
                            } catch (err) {
                                console.error(`Error updating TD Synnex logo:`, err);
                            }
                        })();
                        logoUpdatePromises.push(updatePromise);
                    }
                    console.log(`  → FORCED TD Synnex logo: ${companyData.name}`);
                } else {
                    // Use logo from jobs if company doesn't have one (but not for admin accounts)
                    if (!logo && companyLogosMap.has(companyKey)) {
                        logo = companyLogosMap.get(companyKey);
                        console.log(`  → Using logo from jobs: ${logo}`);
                    }
                    
                    // If still no logo, fetch it automatically (but not for admin accounts)
                    if (!logo && companyData.name) {
                    console.log(`  → Fetching logo for: ${companyData.name}`);
                    const fetchPromise = fetchCompanyLogo(companyData.name).then(async (logoUrl) => {
                        console.log(`  → Fetched logo for ${companyData.name}: ${logoUrl}`);
                        if (logoUrl) {
                            try {
                                // Update company document with logo (only if company has an ID)
                                if (companyData.id) {
                                    const companyRef = doc(db, 'companies', companyData.id);
                                    await updateDoc(companyRef, { logo: logoUrl });
                                    console.log(`  → Updated company document with logo`);
                                }
                                // Update local data
                                companyData.logo = logoUrl;
                            } catch (err) {
                                console.error(`Error updating logo for company ${companyData.id}:`, err);
                            }
                        } else {
                            console.log(`  → No logo found for ${companyData.name}`);
                        }
                    });
                    logoUpdatePromises.push(fetchPromise);
                    }
                }
                
                // Final check: Force correct logos for special companies
                const finalCheckName = (companyData.name || '').toLowerCase().trim();
                const finalIsAdmin = finalCheckName.includes('admin') && (
                    finalCheckName.includes('1255') || 
                    finalCheckName.includes('partnerships') || 
                    finalCheckName.includes('careers')
                );
                if (finalIsAdmin) {
                    logo = '/logo-icon.svg';
                    companyData.logo = '/logo-icon.svg';
                } else if (finalCheckName.includes('confluent')) {
                    logo = 'https://www.confluent.io/wp-content/themes/confluent/assets/images/logo/confluent-logo.svg';
                    companyData.logo = 'https://www.confluent.io/wp-content/themes/confluent/assets/images/logo/confluent-logo.svg';
                } else if (finalCheckName.includes('elastic')) {
                    logo = 'https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/blt280217a63b82a029/6202d3378b1f312528798412/logo-elastic.svg';
                    companyData.logo = 'https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/blt280217a63b82a029/6202d3378b1f312528798412/logo-elastic.svg';
                } else if (finalCheckName.includes('databricks')) {
                    logo = 'https://www.databricks.com/wp-content/uploads/2020/09/databricks-logo.svg';
                    companyData.logo = 'https://www.databricks.com/wp-content/uploads/2020/09/databricks-logo.svg';
                } else if (finalCheckName.includes('confluent')) {
                    logo = 'https://www.confluent.io/wp-content/themes/confluent/assets/images/logo/confluent-logo.svg';
                    companyData.logo = 'https://www.confluent.io/wp-content/themes/confluent/assets/images/logo/confluent-logo.svg';
                } else if (finalCheckName.includes('elastic')) {
                    logo = 'https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/blt280217a63b82a029/6202d3378b1f312528798412/logo-elastic.svg';
                    companyData.logo = 'https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/blt280217a63b82a029/6202d3378b1f312528798412/logo-elastic.svg';
                } else if (finalCheckName.includes('databricks')) {
                    logo = 'https://www.databricks.com/wp-content/uploads/2020/09/databricks-logo.svg';
                    companyData.logo = 'https://www.databricks.com/wp-content/uploads/2020/09/databricks-logo.svg';
                } else if (finalCheckName.includes('td synnex') || finalCheckName.includes('tdsynnex') || finalCheckName.includes('synnex spain')) {
                    logo = 'https://www.google.com/s2/favicons?domain=tdsynnex.com&sz=256';
                    companyData.logo = 'https://www.google.com/s2/favicons?domain=tdsynnex.com&sz=256';
                }
                
                companiesArray.push({
                    ...companyData,
                    logo: logo || companyData.logo || ''
                });
            }
            
            // Also add companies that appear in jobs but not in companies collection
            jobsSnapshot.forEach((docSnapshot) => {
                const jobData = docSnapshot.data();
                if (jobData.company) {
                    const normalizedKey = normalizeCompanyName(jobData.company);
                    if (!companiesMap.has(normalizedKey)) {
                        // Company exists in jobs but not in companies collection
                        let logo = jobData.companyLogo || '';
                        const normalizedName = (jobData.company || '').toLowerCase().trim();
                        // Special handling for admin accounts - ALWAYS use PC logo
                        const isAdminAccount = normalizedName.includes('admin') && (
                            normalizedName.includes('1255') || 
                            normalizedName.includes('partnerships') || 
                            normalizedName.includes('careers')
                        );
                        if (isAdminAccount) {
                            // FORCE PC logo for admin accounts
                            logo = '/logo-icon.svg';
                        }
                        companiesArray.push({
                            id: null, // Not in companies collection
                            name: jobData.company,
                            logo: logo,
                            website: '',
                            fromJobs: true // Flag to indicate it came from jobs
                        });
                    }
                }
            });
            
            // Wait for logo fetches to complete
            if (logoUpdatePromises.length > 0) {
                console.log(`Waiting for ${logoUpdatePromises.length} logo fetches to complete...`);
                await Promise.allSettled(logoUpdatePromises);
                console.log('Logo fetches completed');
                
                // Re-fetch companies to get updated logos
                const updatedSnapshot = await getDocs(companiesRef);
                const updatedMap = new Map();
                updatedSnapshot.forEach((docSnapshot) => {
                    const companyData = docSnapshot.data();
                    const normalizedKey = normalizeCompanyName(companyData.name);
                    updatedMap.set(normalizedKey, {
                        id: docSnapshot.id,
                        ...companyData
                    });
                });
                
                // Update logos in companiesArray
                companiesArray.forEach((company, index) => {
                    const normalizedKey = normalizeCompanyName(company.name);
                    const updated = updatedMap.get(normalizedKey);
                    if (updated && updated.logo) {
                        console.log(`Updating logo for ${company.name}: ${updated.logo}`);
                        companiesArray[index].logo = updated.logo;
                    }
                });
            }
            
            // Deduplicate companies by normalized name (case-insensitive, whitespace-insensitive)
            const uniqueCompaniesMap = new Map();
            companiesArray.forEach((company) => {
                const normalizedKey = normalizeCompanyName(company.name);
                if (normalizedKey && !uniqueCompaniesMap.has(normalizedKey)) {
                    uniqueCompaniesMap.set(normalizedKey, company);
                } else if (normalizedKey && uniqueCompaniesMap.has(normalizedKey)) {
                    // If duplicate, prefer the one with an ID (from companies collection)
                    const existing = uniqueCompaniesMap.get(normalizedKey);
                    if (!existing.id && company.id) {
                        // Prefer the one with ID
                        uniqueCompaniesMap.set(normalizedKey, company);
                    } else if (existing.id && !company.id) {
                        // Keep existing if it has ID, but merge logo if needed
                        if (!existing.logo && company.logo) {
                            uniqueCompaniesMap.set(normalizedKey, { ...existing, logo: company.logo });
                        }
                    } else if (!existing.logo && company.logo) {
                        // Prefer one with logo
                        uniqueCompaniesMap.set(normalizedKey, { ...existing, logo: company.logo });
                    } else if (!existing.name && company.name) {
                        // Prefer one with a proper name
                        uniqueCompaniesMap.set(normalizedKey, company);
                    }
                    // If both have same data quality, prefer the canonical name (with proper spacing)
                    // "Palo Alto Networks" is better than "PaloAlto Networks"
                    const existingName = existing.name || '';
                    const newName = company.name || '';
                    if (existingName.includes(' ') && !newName.includes(' ')) {
                        // Keep existing if it has proper spacing
                    } else if (!existingName.includes(' ') && newName.includes(' ')) {
                        // Prefer new one if it has proper spacing
                        uniqueCompaniesMap.set(normalizedKey, company);
                    }
                }
            });
            
            const uniqueCompanies = Array.from(uniqueCompaniesMap.values());
            
            // Sort by name
            uniqueCompanies.sort((a, b) => a.name.localeCompare(b.name));
            console.log(`Setting ${uniqueCompanies.length} unique companies with logos:`, uniqueCompanies.map(c => ({ name: c.name, hasLogo: !!c.logo, logo: c.logo })));
            setAllCompanies(uniqueCompanies);
        } catch (err) {
            console.error('Error fetching companies:', err);
        } finally {
            setCompaniesLoading(false);
        }
    };

    const fetchJobs = async () => {
        setLoading(true);
        setError('');
        try {
            const jobsRef = collection(db, 'jobs');
            let querySnapshot;
            try {
                // Try querying with status filter first
                const q = query(jobsRef, where('status', '==', 'active'));
                querySnapshot = await getDocs(q);
            } catch (queryError) {
                // If query fails (e.g., some jobs don't have status field), fetch all and filter
                console.warn('Query with status filter failed, fetching all jobs and filtering:', queryError);
                querySnapshot = await getDocs(jobsRef);
            }
            
            const jobsArray = [];
            const summariesToAdd = {};
            const logoUpdatePromises = [];
            
            querySnapshot.forEach((docSnapshot) => {
                try {
                    const jobData = docSnapshot.data();
                    if (!jobData) return; // Skip if no data
                    
                    // Filter for active jobs if we fetched all jobs (fallback case)
                    // If status exists and is not 'active', skip this job
                    if (jobData.status !== undefined && jobData.status !== 'active') {
                        return;
                    }
                    // If status doesn't exist, treat as active (for backward compatibility)
                    
                    // Backfill missing postedDate
                    if (!jobData.postedDate) {
                        const updatePromise = (async () => {
                            try {
                                const jobRef = doc(db, 'jobs', docSnapshot.id);
                                // Use createdAt if available, otherwise use current date
                                let postedDateValue;
                                if (jobData.createdAt) {
                                    // If createdAt is a Firestore Timestamp, use it directly
                                    if (jobData.createdAt.toDate) {
                                        postedDateValue = jobData.createdAt;
                                    } else if (jobData.createdAt.seconds) {
                                        // If it's a timestamp object with seconds
                                        postedDateValue = jobData.createdAt;
                                    } else {
                                        // If it's a string or other format, convert to Timestamp
                                        postedDateValue = Timestamp.fromDate(new Date(jobData.createdAt));
                                    }
                                } else {
                                    // Use current date
                                    postedDateValue = Timestamp.now();
                                }
                                await updateDoc(jobRef, { postedDate: postedDateValue });
                                console.log(`Updated missing postedDate for job ${docSnapshot.id}`);
                            } catch (err) {
                                console.error(`Error updating postedDate for job ${docSnapshot.id}:`, err);
                            }
                        })();
                        logoUpdatePromises.push(updatePromise);
                    }
                    
                    // Backfill missing logos
                    if (!jobData.companyLogo && jobData.company) {
                        const updatePromise = fetchCompanyLogo(jobData.company).then(async (logoUrl) => {
                            if (logoUrl) {
                                try {
                                    const jobRef = doc(db, 'jobs', docSnapshot.id);
                                    await updateDoc(jobRef, { companyLogo: logoUrl });
                                } catch (err) {
                                    console.error(`Error updating logo for job ${docSnapshot.id}:`, err);
                                }
                            }
                        });
                        logoUpdatePromises.push(updatePromise);
                    }
                    
                    // Convert Firestore Timestamp to Date string if needed
                    let postedDate = jobData.postedDate;
                    if (postedDate) {
                        if (postedDate.toDate) {
                            // Firestore Timestamp
                            postedDate = postedDate.toDate().toISOString();
                        } else if (postedDate.seconds) {
                            // Timestamp object with seconds
                            postedDate = new Date(postedDate.seconds * 1000).toISOString();
                        } else if (typeof postedDate === 'string') {
                            // Already a string
                            postedDate = postedDate;
                        } else {
                            // Try to convert
                            postedDate = new Date(postedDate).toISOString();
                        }
                    }
                    
                    jobsArray.push({
                        id: docSnapshot.id,
                        ...jobData,
                        postedDate: postedDate || null,
                        isFeatured: jobData.isFeatured === true,
                        learnMoreClicks: jobData.learnMoreClicks || 0,
                        totalClicks: jobData.totalClicks || 0,
                        roleSummary: jobData.roleSummary || null,
                        companySummary: jobData.companySummary || null,
                        salaryRange: jobData.salaryRange || null,
                        companyLogo: jobData.companyLogo || null,
                        companyStage: jobData.companyStage || null,
                        companySize: jobData.companySize || null,
                        isRemote: jobData.isRemote || false,
                        hasEquity: jobData.hasEquity || false,
                        hasVisa: jobData.hasVisa || false,
                        applicantCount: jobData.applicantCount || 0
                    });
                    
                    // Collect summaries to add
                    if (jobData.roleSummary && jobData.companySummary) {
                        summariesToAdd[docSnapshot.id] = {
                            role: jobData.roleSummary,
                            company: jobData.companySummary
                        };
                    }
                } catch (err) {
                    console.error('Error processing job:', err);
                }
            });
            
            // Batch update summaries state once
            if (Object.keys(summariesToAdd).length > 0) {
                setJobSummaries(prev => ({ ...prev, ...summariesToAdd }));
            }
            
            // Wait for logo updates to complete, then refresh if any were updated
            if (logoUpdatePromises.length > 0) {
                await Promise.allSettled(logoUpdatePromises);
                // Re-fetch jobs to get updated logos
                const updatedSnapshot = await getDocs(q);
                const updatedJobsArray = [];
                updatedSnapshot.forEach((docSnapshot) => {
                    const jobData = docSnapshot.data();
                    if (!jobData) return;
                    
                    // Convert Firestore Timestamp to Date string if needed
                    let postedDate = jobData.postedDate;
                    if (postedDate) {
                        if (postedDate.toDate) {
                            // Firestore Timestamp
                            postedDate = postedDate.toDate().toISOString();
                        } else if (postedDate.seconds) {
                            // Timestamp object with seconds
                            postedDate = new Date(postedDate.seconds * 1000).toISOString();
                        } else if (typeof postedDate === 'string') {
                            // Already a string
                            postedDate = postedDate;
                        } else {
                            // Try to convert
                            postedDate = new Date(postedDate).toISOString();
                        }
                    }
                    
                    updatedJobsArray.push({
                        id: docSnapshot.id,
                        ...jobData,
                        postedDate: postedDate || null,
                        isFeatured: jobData.isFeatured === true,
                        learnMoreClicks: jobData.learnMoreClicks || 0,
                        totalClicks: jobData.totalClicks || 0,
                        roleSummary: jobData.roleSummary || null,
                        companySummary: jobData.companySummary || null,
                        salaryRange: jobData.salaryRange || null,
                        companyLogo: jobData.companyLogo || null,
                        companyStage: jobData.companyStage || null,
                        companySize: jobData.companySize || null,
                        isRemote: jobData.isRemote || false,
                        hasEquity: jobData.hasEquity || false,
                        hasVisa: jobData.hasVisa || false,
                        applicantCount: jobData.applicantCount || 0
                    });
                });
                setJobs(updatedJobsArray);
            } else {
                setJobs(jobsArray);
            }
            
            if (jobsArray.length === 0) {
                setError('No jobs found. Post your first job to get started!');
            }
            console.log(`Loaded ${jobsArray.length} jobs from Firestore`);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError(`Error loading jobs: ${err.message}. Please make sure Firebase Firestore is set up correctly.`);
        } finally {
            setLoading(false);
        }
    };

    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            const matchesLevel = selectedLevel === 'All' || job.level === selectedLevel;
            const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;
            const matchesRegion = selectedRegion === 'All' || job.region === selectedRegion;
            return matchesLevel && matchesCategory && matchesRegion;
        });
    }, [jobs, selectedLevel, selectedCategory, selectedRegion]);

    const featuredJobs = filteredJobs.filter(job => job.isFeatured);
    const regularJobs = filteredJobs.filter(job => !job.isFeatured);

    // Fetch company fast facts
    const fetchCompanyFastFacts = async (companyName, companyWebsite, jobData) => {
        const companyKey = companyName?.toLowerCase();
        if (!companyKey) return null;

        // Check if already in state
        if (companyFastFacts[companyKey]) {
            return companyFastFacts[companyKey];
        }

        // Check if exists in Firestore
        try {
            const companiesRef = collection(db, 'companies');
            const companiesSnapshot = await getDocs(companiesRef);
            let companyDoc = null;
            
            companiesSnapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                if (data.name?.toLowerCase() === companyKey) {
                    companyDoc = { id: docSnapshot.id, ...data };
                }
            });

            if (companyDoc?.fastFacts) {
                const facts = companyDoc.fastFacts;
                // Check if data is fresh (less than 7 days old)
                const lastRefreshed = new Date(facts.lastRefreshed);
                const daysSinceRefresh = (new Date() - lastRefreshed) / (1000 * 60 * 60 * 24);
                
                if (daysSinceRefresh < 7) {
                    setCompanyFastFacts(prev => ({ ...prev, [companyKey]: facts }));
                    return facts;
                }
            }
        } catch (error) {
            console.error('Error checking Firestore for fast facts:', error);
        }

        // Fetch from API
        try {
            console.log('🔍 Fetching company fast facts for:', companyName);
            const response = await fetch('/api/fetch-company-facts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyName,
                    companyWebsite: companyWebsite || '',
                    jobData
                })
            });

            console.log('📡 API Response status:', response.status);

            if (response.ok) {
                const facts = await response.json();
                console.log('✅ Received company facts:', facts);
                
                // Validate facts object
                if (!facts || typeof facts !== 'object') {
                    console.error('❌ Invalid facts object received:', facts);
                    return null;
                }
                
                // Store in Firestore
                try {
                    const companiesRef = collection(db, 'companies');
                    const companiesSnapshot = await getDocs(companiesRef);
                    let companyRef = null;
                    
                    companiesSnapshot.forEach((docSnapshot) => {
                        const data = docSnapshot.data();
                        if (data.name?.toLowerCase() === companyKey) {
                            companyRef = doc(db, 'companies', docSnapshot.id);
                        }
                    });

                    if (companyRef) {
                        await updateDoc(companyRef, { fastFacts: facts });
                        console.log('💾 Updated company document in Firestore');
                    } else {
                        // Create new company document
                        await addDoc(companiesRef, {
                            name: companyName,
                            website: companyWebsite || '',
                            fastFacts: facts
                        });
                        console.log('💾 Created new company document in Firestore');
                    }
                } catch (error) {
                    console.error('❌ Error saving fast facts to Firestore:', error);
                }

                setCompanyFastFacts(prev => {
                    const updated = { ...prev, [companyKey]: facts };
                    console.log('✅ Company fast facts set in state. Current state:', updated);
                    return updated;
                });
                return facts;
            } else {
                const errorText = await response.text();
                console.error('❌ API Error:', response.status, errorText);
                // Return fallback facts from job data
                const fallbackFacts = {
                    companyId: companyKey,
                    name: companyName,
                    oneLine: `${companyName} is a technology company focused on partnership development.`,
                    hq: jobData?.location || null,
                    workModel: jobData?.isRemote ? 'Remote-first' : (jobData?.location?.toLowerCase().includes('hybrid') ? 'Hybrid' : 'Onsite'),
                    fundingStage: jobData?.companyStage || null,
                    headcount: jobData?.companySize ? (() => {
                        const sizeMap = {
                            '1-10': 5, '11-50': 30, '51-200': 125, '201-500': 350,
                            '501-1000': 750, '1001-2000': 1500, '2000-5000': 3500, '5000+': 10000
                        };
                        return sizeMap[jobData.companySize] || null;
                    })() : null,
                    links: {
                        careers: companyWebsite ? `https://${extractDomain(companyWebsite)}/careers` : null,
                        partners: companyWebsite ? `https://${extractDomain(companyWebsite)}/partners` : null
                    },
                    sources: { fallback: 'Job data' },
                    lastRefreshed: new Date().toISOString()
                };
                setCompanyFastFacts(prev => ({ ...prev, [companyKey]: fallbackFacts }));
                return fallbackFacts;
            }
        } catch (error) {
            console.error('❌ Error fetching company fast facts:', error);
        }

        return null;
    };

    // Helper function to extract domain
    const extractDomain = (urlOrName) => {
        if (!urlOrName) return null;
        if (urlOrName.includes('.') && !urlOrName.includes(' ')) {
            return urlOrName.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        }
        try {
            const url = new URL(urlOrName.startsWith('http') ? urlOrName : `https://${urlOrName}`);
            return url.hostname.replace(/^www\./, '');
        } catch {
            return null;
        }
    };

    // Generate AI summary for a job and store in Firestore
    const generateJobSummary = async (job) => {
        // Check if already in state
        if (jobSummaries[job.id]) {
            return jobSummaries[job.id];
        }

        // Check if summary exists in Firestore
        try {
            const jobRef = doc(db, 'jobs', job.id);
            const jobDoc = await getDoc(jobRef);
            if (jobDoc.exists()) {
                const jobData = jobDoc.data();
                if (jobData.roleSummary && jobData.companySummary) {
                    const summary = {
                        role: jobData.roleSummary,
                        company: jobData.companySummary
                    };
                    setJobSummaries(prev => ({ ...prev, [job.id]: summary }));
                    return summary;
                }
            }
        } catch (error) {
            console.error('Error fetching summary from Firestore:', error);
        }

        // Generate role summary (2-3 sentences)
        let roleSummary = '';
        if (job.description && job.description.trim().length > 0) {
            // Use first 2-3 sentences from description
            const sentences = job.description.split(/[.!?]+/).filter(s => s.trim().length > 10);
            if (sentences.length >= 2) {
                roleSummary = sentences.slice(0, 2).join('. ').trim() + '.';
            } else if (sentences.length === 1) {
                roleSummary = sentences[0].trim() + '. This role focuses on building and managing strategic partnerships to drive business growth.';
            } else {
                roleSummary = `${job.title} at ${job.company} focuses on ${job.category.toLowerCase()} partnerships. This role involves managing strategic partnerships and driving business growth through collaborative relationships.`;
            }
        } else {
            roleSummary = `${job.title} at ${job.company} focuses on ${job.category.toLowerCase()} partnerships. This role involves managing strategic partnerships and driving business growth through collaborative relationships. The position requires strong relationship-building skills and expertise in partnership development.`;
        }
        
        // Generate company summary (2-3 sentences)
        const categoryDesc = {
            'Channel & Reseller': 'channel and reseller partnerships',
            'Technology & ISV': 'technology integrations and ISV partnerships',
            'Strategic Alliances': 'strategic alliances and enterprise partnerships',
            'Ecosystem & Marketplace': 'ecosystem development and marketplace programs',
            'Distribution & OEM': 'distribution channels and OEM partnerships',
            'Agency & Services': 'agency relationships and service partnerships'
        };
        
        const companySummary = `${job.company} is a leading organization specializing in ${categoryDesc[job.category] || job.category.toLowerCase()}. The company works closely with partners to deliver innovative solutions and drive mutual success in the market through strategic collaboration and relationship building.`;

        const summary = {
            role: roleSummary,
            company: companySummary
        };

        // Store in Firestore
        try {
            const jobRef = doc(db, 'jobs', job.id);
            await updateDoc(jobRef, {
                roleSummary: roleSummary,
                companySummary: companySummary
            });
        } catch (error) {
            console.error('Error saving summary to Firestore:', error);
        }

        setJobSummaries(prev => ({ ...prev, [job.id]: summary }));
        return summary;
    };

    const handleLearnMore = async (job) => {
        try {
            const isExpanding = !expandedJobs.includes(job.id);
            
            if (isExpanding) {
                // Track learn more click
                await trackLearnMore(job.id, db);
                // Generate summary if not already generated
                await generateJobSummary(job);
                // Fetch company fast facts
                await fetchCompanyFastFacts(job.company, job.companyWebsite || '', job);
                setExpandedJobs(prev => [...prev, job.id]);
            } else {
                setExpandedJobs(prev => prev.filter(id => id !== job.id));
            }
        } catch (error) {
            console.error('Error in handleLearnMore:', error);
        }
    };

    const handleSignUp = async (email, firstName, lastName, company, website, password) => {
        // Firebase email/password sign-up
        try {
            // Validate email - must be corporate/work email unless whitelisted
            if (!isWhitelistedAdmin(email) && isPersonalEmailDomain(email)) {
                alert('❌ Please use your corporate or company email address to sign up.\n\nPersonal email addresses (Gmail, Yahoo, etc.) are not allowed for employer accounts.\n\nOnly work email addresses can create employer accounts to post jobs.');
                return;
            }
            
            // Validate required fields
            if (!email || !email.trim()) {
                alert('Please enter your email address');
                return;
            }
            
            if (!firstName || !firstName.trim()) {
                alert('Please enter your first name');
                return;
            }
            
            if (!password || !password.trim()) {
                alert('Please enter a password');
                return;
            }
            
            if (password.length < 6) {
                alert('Password must be at least 6 characters long');
                return;
            }
            
            // Create Firebase user with email/password
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const firebaseUser = userCredential.user;
            
            // Save user profile data to Firestore
            try {
                const userProfileRef = doc(db, 'users', firebaseUser.uid);
                await setDoc(userProfileRef, {
                    email: email.trim(),
                    firstName: firstName.trim(),
                    lastName: lastName ? lastName.trim() : '',
                    company: company ? company.trim() : '',
                    website: website ? website.trim() : '',
                    createdAt: new Date().toISOString(),
                    role: 'employer'
                });
                console.log('✅ User profile saved to Firestore');
            } catch (profileError) {
                console.error('Error saving user profile:', profileError);
                // Continue even if profile save fails
            }
            
            alert('✅ Account created successfully! You are now logged in.');
        } catch (error) {
            console.error('Sign up error:', error);
            let errorMessage = 'Error creating account: ';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage += 'This email is already registered. Please log in instead.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage += 'Please enter a valid email address.';
            } else if (error.code === 'auth/weak-password') {
                errorMessage += 'Password is too weak. Please use a stronger password.';
            } else {
                errorMessage += error.message || 'Unknown error';
            }
            alert(errorMessage);
        }
    };

    const handleForgotPassword = async (email) => {
        // Firebase password reset
        try {
            if (!email || !email.trim()) {
                alert('Please enter your email address');
                return;
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('Please enter a valid email address');
                return;
            }
            
            // Send password reset email
            await sendPasswordResetEmail(auth, email.trim());
            alert('✅ Password reset email sent! Please check your inbox for instructions.');
            setResetEmailSent(true);
            setShowForgotPassword(false);
        } catch (error) {
            console.error('Password reset error:', error);
            let errorMessage = 'Error sending password reset email: ';
            if (error.code === 'auth/user-not-found') {
                errorMessage += 'No account found with this email address.';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage += 'Please enter a valid email address.';
            } else {
                errorMessage += error.message || 'Unknown error';
            }
            alert(errorMessage);
        }
    };
    
    // LinkedIn OAuth handler for employer verification
    const handleLinkedInSignIn = async () => {
        try {
            setLinkedinAuthLoading(true);
            const clientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID || '';
            
            if (!clientId) {
                alert('LinkedIn integration not configured yet. Please add VITE_LINKEDIN_CLIENT_ID to your environment variables.');
                setLinkedinAuthLoading(false);
                return;
            }
            
            // Get redirect URI
            const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
            
            // Build LinkedIn OAuth URL
            const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=linkedin_oauth_state&scope=openid%20profile%20email`;
            
            // Store state for verification
            sessionStorage.setItem('linkedin_oauth_state', 'linkedin_oauth_state');
            sessionStorage.setItem('linkedin_redirect_uri', redirectUri);
            
            // Redirect to LinkedIn
            window.location.href = linkedinAuthUrl;
        } catch (error) {
            console.error('❌ Error initiating LinkedIn sign-in:', error);
            alert('Error connecting to LinkedIn: ' + (error.message || 'Unknown error'));
            setLinkedinAuthLoading(false);
        }
    };

    // Process LinkedIn OAuth callback
    useEffect(() => {
        const handleLinkedInCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const error = urlParams.get('error');
            
            if (error) {
                console.error('LinkedIn OAuth error:', error);
                alert('LinkedIn sign-in was cancelled or failed. Please try again.');
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
                return;
            }
            
            if (code && state === 'linkedin_oauth_state') {
                try {
                    setLinkedinAuthLoading(true);
                    const redirectUri = sessionStorage.getItem('linkedin_redirect_uri') || `${window.location.origin}/auth/linkedin/callback`;
                    
                    // Verify LinkedIn token and get user data
                    const response = await fetch('/api/verify-linkedin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, redirectUri }),
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                        throw new Error(errorData.error || 'Failed to verify LinkedIn account');
                    }
                    
                    const result = await response.json();
                    const userData = result.userData;
                    
                    if (!userData || !userData.email) {
                        throw new Error('Could not retrieve email from LinkedIn');
                    }
                    
                    // Verify job title (skip for whitelisted admins)
                    if (!isWhitelistedAdmin(userData.email) && !isRecruiterRole(userData.jobTitle)) {
                        const errorMessage = `Your LinkedIn shows you're a ${userData.jobTitle || 'Unknown Title'} at ${userData.company || 'your company'}.

This platform is for recruiting and HR teams only.

✅ If you're in recruiting: Update your LinkedIn title to include 'Recruiter', 'Talent Acquisition', or 'HR'
✅ If you're not in recruiting: Have your recruiting team sign up instead

Questions? support@partnerships-careers.com`;
                        
                        alert(errorMessage);
                        window.history.replaceState({}, document.title, window.location.pathname);
                        setLinkedinAuthLoading(false);
                        return;
                    }
                    
                    // Check if company already exists by email domain
                    const emailDomain = getEmailDomain(userData.email);
                    const companiesRef = collection(db, 'companies');
                    const allCompaniesSnapshot = await getDocs(companiesRef);
                    let existingCompany = null;
                    
                    allCompaniesSnapshot.forEach((docSnapshot) => {
                        const companyData = docSnapshot.data();
                        if (companyData.emailDomain && companyData.emailDomain === emailDomain) {
                            existingCompany = { id: docSnapshot.id, ...companyData };
                        }
                    });
                    
                    if (existingCompany) {
                        // Company exists - show request access flow
                        // Try to get admin email from claimedBy user ID
                        let adminEmail = 'Email not available';
                        if (existingCompany.claimedBy) {
                            try {
                                const adminUserDoc = await getDoc(doc(db, 'users', existingCompany.claimedBy));
                                if (adminUserDoc.exists()) {
                                    adminEmail = adminUserDoc.data().email || adminEmail;
                                }
                            } catch (err) {
                                console.error('Error fetching admin email:', err);
                            }
                        }
                        setLinkedinUserData(userData);
                        setExistingCompanyInfo({ ...existingCompany, claimedByEmail: adminEmail });
                        setShowRequestAccessModal(true);
                        setShowEmployerLogin(false);
                        window.history.replaceState({}, document.title, window.location.pathname);
                        setLinkedinAuthLoading(false);
                        return;
                    }
                    
                    // Company doesn't exist - create new account
                    // Create Firebase account with LinkedIn email
                    try {
                        // Generate a random password (user won't need to know it)
                        const tempPassword = Math.random().toString(36).slice(-16) + 'A1!';
                        
                        // Create Firebase account
                        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, tempPassword);
                        const firebaseUser = userCredential.user;
                        
                        // Extract company name from email domain or use placeholder
                        const companyName = extractCompanyFromEmail(userData.email) || userData.company || 'Your Company';
                        
                        // Create company account
                        const companiesRef = collection(db, 'companies');
                        const companyDoc = await addDoc(companiesRef, {
                            name: companyName,
                            emailDomain: emailDomain,
                            claimedAt: new Date().toISOString(),
                            claimedBy: firebaseUser.uid,
                            website: '',
                            createdAt: new Date().toISOString(),
                        });
                        
                        // Save user profile with LinkedIn data
                        const userProfileRef = doc(db, 'users', firebaseUser.uid);
                        await setDoc(userProfileRef, {
                            email: userData.email.toLowerCase(),
                            firstName: userData.firstName,
                            lastName: userData.lastName || '',
                            company: companyName,
                            linkedinId: userData.linkedinId,
                            linkedinProfileUrl: userData.profileUrl,
                            linkedinJobTitle: userData.jobTitle,
                            linkedinProfilePicture: userData.profilePicture || '',
                            createdAt: new Date().toISOString(),
                            role: 'employer',
                            companyId: companyDoc.id,
                            isAdmin: true, // First user becomes admin
                        });
                        
                        // Add user to company members
                        const membersRef = collection(db, 'companyMembers');
                        await addDoc(membersRef, {
                            companyId: companyDoc.id,
                            userId: firebaseUser.uid,
                            email: userData.email.toLowerCase(),
                            firstName: userData.firstName,
                            lastName: userData.lastName || '',
                            isAdmin: true,
                            joinedAt: new Date().toISOString(),
                        });
                        
                        alert('🎉 Account created successfully! You are now logged in as the company admin.');
                        setShowEmployerLogin(false);
                        window.history.replaceState({}, document.title, window.location.pathname);
                        setLinkedinAuthLoading(false);
                        
                        // Refresh auth state to log them in
                        // The onAuthStateChanged will handle the rest
                    } catch (accountError) {
                        console.error('Error creating account:', accountError);
                        let errorMessage = 'Error creating account: ';
                        if (accountError.code === 'auth/email-already-in-use') {
                            errorMessage += 'This email is already registered. Please log in instead.';
                        } else {
                            errorMessage += accountError.message || 'Unknown error';
                        }
                        alert(errorMessage);
                        window.history.replaceState({}, document.title, window.location.pathname);
                        setLinkedinAuthLoading(false);
                    }
                    
                } catch (error) {
                    console.error('Error processing LinkedIn callback:', error);
                    alert('Error processing LinkedIn sign-in: ' + error.message);
                    window.history.replaceState({}, document.title, window.location.pathname);
                    setLinkedinAuthLoading(false);
                }
            }
        };
        
        handleLinkedInCallback();
    }, []);

    // Load companies when companies page opens
    useEffect(() => {
        if (showCompaniesPage && allCompanies.length === 0 && !companiesLoading) {
            fetchAllCompanies();
        }
    }, [showCompaniesPage, allCompanies.length, companiesLoading]);
    

    const handleGoogleSignIn = async () => {
        // Use Firebase Google sign-in (same as handleLogin)
        try {
            console.log('🔐 Initiating Google sign-in via Firebase');
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error('❌ Error signing in with Google:', error);
            setAuthError(error);
            alert('Error signing in with Google: ' + (error.message || 'Unknown error'));
        }
    };
    
    // Microsoft sign-in handler using Firebase
    const handleMicrosoftSignIn = async () => {
        try {
            console.log('🔐 Initiating Microsoft sign-in via Firebase');
            await signInWithPopup(auth, microsoftProvider);
        } catch (error) {
            console.error('❌ Error signing in with Microsoft:', error);
            setAuthError(error);
            let errorMessage = 'Error signing in with Microsoft: ';
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage += 'Sign-in was cancelled.';
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage += 'An account already exists with this email using a different sign-in method.';
            } else {
                errorMessage += error.message || 'Unknown error';
            }
            alert(errorMessage);
        }
    };


    const handlePromoteJob = async (job) => {
        // Development mode: Skip payment on localhost
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
            // Skip payment in development - mark as featured directly
            try {
                const jobRef = doc(db, 'jobs', job.id);
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 30);
                
                await updateDoc(jobRef, {
                    isFeatured: true,
                    featuredExpiryDate: expiryDate.toISOString(),
                    status: 'active'
                });
                
                alert('✅ Job promoted to featured! (Payment skipped in development mode)');
                fetchJobs();
            } catch (error) {
                console.error('Error promoting job:', error);
                alert('Error promoting job: ' + error.message);
            }
            return;
        }
        
        // Production: Use Stripe payment
        try {
            const response = await fetch('/api/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'promote',
                    jobId: job.id || job.title.replace(/\s+/g, '-').toLowerCase(),
                    jobTitle: job.title,
                    employerId: user?.uid || 'unknown',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to create checkout session');
            }
            const { url } = await response.json();
            window.location.href = url;
        } catch (error) {
            console.error('Payment error:', error);
            alert('Error starting payment: ' + error.message + '\n\nNote: Payments only work when deployed to Vercel.');
        }
    };

    const handlePostNewJob = async () => {
        // Development mode: Skip payment on localhost
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
            // Skip payment in development - go directly to job form
            console.log('Development mode: Skipping payment, showing job form directly');
            setShowJobForm(true);
            return;
        }
        
        // Production: Use Stripe payment
        try {
            const response = await fetch('/api/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'new',
                    employerId: user?.uid || 'unknown',
                    company: employerCompany,
                    email: user?.email || '', // Pass email for admin whitelist check
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to create checkout session');
            }
            const { url } = await response.json();
            window.location.href = url;
        } catch (error) {
            console.error('Payment error:', error);
            alert('Error starting payment: ' + error.message + '\n\nNote: Payments only work when deployed to Vercel. For local testing, the payment is skipped and you can post jobs directly.');
            // Fallback: Show form anyway in case of error
            setShowJobForm(true);
        }
    };

    const handleSubmitNewJob = async (e) => {
        e.preventDefault();
        
        if (!newJobData.title || !newJobData.location || !newJobData.description || !newJobData.link) {
            alert('Please fill out all required fields');
            return;
        }

        // Development mode: Skip payment on localhost
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
            // Skip payment in development - post directly
            console.log('Development mode: Skipping payment, posting job directly');
            await postJobToFirestore();
            return;
        }

        try {
            // Automatically fetch company logo if not provided
            let companyLogo = newJobData.companyLogo || '';
            const companyName = newJobData.company || employerCompany;
            if (!companyLogo && companyName) {
                console.log('Fetching logo for company:', companyName);
                companyLogo = await fetchCompanyLogo(companyName);
                if (companyLogo) {
                    console.log('Successfully fetched logo:', companyLogo);
                } else {
                    console.log('Could not fetch logo automatically');
                }
            }

            // Calculate featured expiry date (30 days from now)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            
            // Prepare job data (don't post yet - wait for payment)
            const jobData = {
                title: newJobData.title,
                company: companyName,
                location: newJobData.location,
                type: newJobData.type,
                salaryRange: newJobData.salaryRange || 'Competitive',
                level: newJobData.level,
                category: newJobData.category,
                region: newJobData.region,
                description: newJobData.description,
                postedDate: new Date().toISOString(),
                isFeatured: true,
                companyId: companyData?.id || '',
                link: newJobData.link,
                featuredExpiryDate: expiryDate.toISOString(),
                learnMoreClicks: 0,
                totalClicks: 0,
                status: 'active',
                createdAt: new Date().toISOString(),
                companyLogo: companyLogo,
                companyStage: newJobData.companyStage || '',
                companySize: newJobData.companySize || '',
                isRemote: newJobData.isRemote || false,
                hasEquity: newJobData.hasEquity || false,
                hasVisa: newJobData.hasVisa || false,
                applicantCount: 0
            };

            // Store job data temporarily
            setPendingJobData(jobData);

            // Create payment intent
            const response = await fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobData: jobData,
                    employerId: user?.uid || 'unknown',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to create payment intent');
            }

            const { clientSecret, paymentIntentId } = await response.json();
            
            // Show payment form
            setPaymentClientSecret(clientSecret);
            setPaymentIntentId(paymentIntentId);
            setShowPaymentForm(true);
            
        } catch (error) {
            console.error('Error creating payment:', error);
            alert('Error processing payment: ' + error.message);
        }
    };

    // Post job to Firestore (called after successful payment)
    const postJobToFirestore = async (jobDataToPost = null) => {
        try {
            const jobData = jobDataToPost || pendingJobData;
            
            if (!jobData) {
                throw new Error('No job data to post');
            }

            // Add user ID
            const jobToSubmit = {
                ...jobData,
                postedBy: user?.uid || 'unknown',
            };

            const jobsRef = collection(db, 'jobs');
            await addDoc(jobsRef, jobToSubmit);

            alert('🎉 Your featured job has been posted successfully!');
            
            // Reset form
            setShowJobForm(false);
            setShowPaymentForm(false);
            setPaymentClientSecret(null);
            setPaymentIntentId(null);
            setPendingJobData(null);
            setNewJobData({
                title: '',
                company: '',
                location: '',
                type: 'Full-Time',
                level: 'Manager',
                category: 'Channel & Reseller',
                region: 'NAmer',
                description: '',
                link: '',
                salaryRange: '',
                companyLogo: '',
                companyStage: '',
                companySize: '',
                isRemote: false,
                hasEquity: false,
                hasVisa: false
            });
            fetchJobs();
        } catch (error) {
            console.error('Error posting job:', error);
            alert('Error posting job: ' + error.message);
        }
    };

    // Handle successful payment
    const handlePaymentSuccess = async (paymentIntentId) => {
        try {
            // Verify payment via API
            const response = await fetch('/api/confirm-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentIntentId: paymentIntentId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || 'Failed to confirm payment');
            }

            const result = await response.json();
            
            if (result.success) {
                // Payment confirmed - now post the job to Firestore
                const jobToPost = {
                    ...result.jobData,
                    postedBy: result.employerId,
                    paymentIntentId: paymentIntentId,
                    paidAt: new Date().toISOString(),
                };

                const jobsRef = collection(db, 'jobs');
                await addDoc(jobsRef, jobToPost);

                alert('🎉 Payment successful! Your featured job has been posted!');
                
                // Reset everything
                setShowJobForm(false);
                setShowPaymentForm(false);
                setPaymentClientSecret(null);
                setPaymentIntentId(null);
                setPendingJobData(null);
                setNewJobData({
                    title: '',
                    company: '',
                    location: '',
                    type: 'Full-Time',
                    level: 'Manager',
                    category: 'Channel & Reseller',
                    region: 'NAmer',
                    description: '',
                    link: '',
                    salaryRange: '',
                    companyLogo: '',
                    companyStage: '',
                    companySize: '',
                    isRemote: false,
                    hasEquity: false,
                    hasVisa: false
                });
                fetchJobs();
            } else {
                throw new Error('Payment confirmation failed');
            }
        } catch (error) {
            console.error('Error confirming payment:', error);
            alert('Payment succeeded but failed to post job. Please contact support with payment ID: ' + paymentIntentId);
        } finally {
            setIsProcessingPayment(false);
        }
    };

    // Removed automatic view tracking - views are now tracked via Learn More button clicks

    // Show loading state while auth initializes
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center transition-colors duration-200">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Error boundary - show error if app crashes
    if (appError) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-200">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md transition-colors duration-200">
                    <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Application Error</h1>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">{appError?.message || 'An unexpected error occurred'}</p>
                    <button 
                        onClick={() => {
                            setAppError(null);
                            window.location.reload();
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    // COMPANIES PAGE
    if (showCompaniesPage) {
        return (
            <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200`}>
                <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 transition-colors duration-200">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3 logo-container">
                                <svg width="360" height="65" viewBox="0 0 360 65" className="h-14 w-auto max-w-full sm:h-16" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="0" y="8" width="52" height="52" rx="6" fill="#4F46E5"/>
                                    <text x="26" y="36" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" fill="white" textAnchor="middle" dominantBaseline="central">PC</text>
                                    <text x="65" y="28" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="700" fill="#1F2937" className="logo-text" dominantBaseline="central">Partnerships Careers</text>
                                    <text x="65" y="50" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="500" fill="#6B7280" className="logo-tagline" dominantBaseline="central">Find Your Next Partnership Role</text>
                                </svg>
                            </div>
                            <div className="flex gap-4 items-center">
                            {/* Dark Mode Toggle Button */}
                            <button
                                type="button"
                                onClick={toggleDarkMode}
                                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                                aria-label="Toggle dark mode"
                            >
                                {isDarkMode ? (
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                    </svg>
                                )}
                            </button>
                            <button
                                onClick={() => setShowCompaniesPage(false)}
                                className="bg-purple-600 dark:bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 font-medium transition-colors duration-200"
                            >
                                View Job Board
                            </button>
                        </div>
                    </div>
                </div>
            </header>
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Our Partner Companies</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Discover the companies hiring for partnership roles</p>
                    
                    {companiesLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="w-8 h-8 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : allCompanies.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400">No companies found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                            {(() => {
                                // Reorder companies: expanded one first, then others
                                // Use a Set to track rendered companies and prevent duplicates
                                const renderedCompanies = new Set();
                                const reorderedCompanies = [];
                                
                                if (expandedCompanyId) {
                                    const expandedCompany = allCompanies.find(c => (c.id || c.name) === expandedCompanyId);
                                    if (expandedCompany) {
                                        reorderedCompanies.push(expandedCompany);
                                        renderedCompanies.add((expandedCompany.id || expandedCompany.name)?.toLowerCase());
                                    }
                                }
                                
                                // Add remaining companies (excluding the expanded one)
                                allCompanies.forEach((company) => {
                                    const companyKey = (company.id || company.name)?.toLowerCase();
                                    if (companyKey && !renderedCompanies.has(companyKey)) {
                                        reorderedCompanies.push(company);
                                        renderedCompanies.add(companyKey);
                                    }
                                });
                                
                                return reorderedCompanies.map((company) => {
                                    const companyKey = company.id || company.name;
                                    const isExpanded = expandedCompanyId === companyKey;
                                    // Use normalized name for matching to catch variations like "Palo Alto Networks" vs "PaloAlto Networks"
                                    const normalizedCompanyName = normalizeCompanyName(company.name);
                                    const companyJobsList = jobs.filter(j => normalizeCompanyName(j.company) === normalizedCompanyName && j.status === 'active');
                                    const companyJobCount = companyJobsList.length;
                                    
                                    return (
                                        <div
                                            key={companyKey}
                                            style={{
                                                gridColumn: isExpanded ? '1 / -1' : 'auto'
                                            }}
                                            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900 p-6 hover:shadow-md dark:hover:shadow-gray-800 transition-all duration-500 ease-in-out flex flex-col overflow-hidden ${
                                                isExpanded ? '' : 'items-center'
                                            }`}
                                        >
                                        {!isExpanded ? (
                                            <>
                                                {/* Logo container - fixed square size */}
                                                <div className="w-32 h-32 flex items-center justify-center mb-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                    {company.logo ? (
                                                        <img
                                                            src={company.logo}
                                                            alt={company.name}
                                                            className="w-24 h-24 object-contain"
                                                            style={{ 
                                                                display: 'block',
                                                                imageRendering: 'crisp-edges',
                                                                WebkitImageRendering: '-webkit-optimize-contrast'
                                                            }}
                                                            onError={(e) => {
                                                                console.log('Logo failed to load for:', company.name, company.logo);
                                                                // For admin accounts, try to reload the PC logo
                                                                const normalizedName = (company.name || '').toLowerCase().trim();
                                                                const isAdminAccount = normalizedName.includes('admin') && (
                                                                    normalizedName.includes('1255') || 
                                                                    normalizedName.includes('partnerships') || 
                                                                    normalizedName.includes('careers')
                                                                );
                                                                if (isAdminAccount && company.logo !== '/logo-icon.svg') {
                                                                    e.target.src = '/logo-icon.svg';
                                                                    return;
                                                                }
                                                                e.target.style.display = 'none';
                                                                const fallback = e.target.parentElement?.querySelector('.logo-fallback');
                                                                if (fallback) {
                                                                    fallback.style.display = 'flex';
                                                                }
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div
                                                        className={`logo-fallback w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center rounded-lg ${company.logo ? 'hidden' : ''}`}
                                                    >
                                                        <img 
                                                            src="/logo-icon.svg" 
                                                            alt="PC Logo" 
                                                            className="w-24 h-24 object-contain"
                                                            style={{ 
                                                                display: 'block',
                                                                imageRendering: 'crisp-edges',
                                                                WebkitImageRendering: '-webkit-optimize-contrast'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white text-center mb-3">{company.name}</h3>
                                                <button
                                                    onClick={async () => {
                                                        setExpandedCompanyId(companyKey);
                                                        if (companyJobsList.length > 0) {
                                                            await generateCompanyOverview(company.name, companyJobsList);
                                                        }
                                                    }}
                                                    className="w-full bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 font-medium text-sm transition-colors duration-200"
                                                >
                                                    See Jobs {companyJobCount > 0 && `(${companyJobCount})`}
                                                </button>
                                                {company.website && (
                                                    <a
                                                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mt-2"
                                                    >
                                                        Visit Website →
                                                    </a>
                                                )}
                                            </>
                                        ) : (
                                            <div className="w-full animate-in fade-in slide-in-from-top-4 duration-500">
                                                {/* Expanded view */}
                                                <div className="flex items-start justify-between mb-6 animate-in fade-in duration-300">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-24 h-24 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg flex-shrink-0">
                                                            {company.logo ? (
                                                                <img
                                                                    src={company.logo}
                                                                    alt={company.name}
                                                                    className="w-full h-full object-contain p-2"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        const fallback = e.target.parentElement?.querySelector('.logo-fallback');
                                                                        if (fallback) {
                                                                            fallback.style.display = 'flex';
                                                                        }
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div
                                                                className={`logo-fallback w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-2xl rounded-lg ${company.logo ? 'hidden' : ''}`}
                                                            >
                                                                {company.name?.charAt(0) || 'C'}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{company.name}</h2>
                                                            {company.website && (
                                                                <a
                                                                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                                                                >
                                                                    Visit Website →
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setExpandedCompanyId(null);
                                                            setCompanyJobs([]);
                                                            setSelectedCompanyForJobs(null);
                                                        }}
                                                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none cursor-pointer"
                                                        aria-label="Close"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                
                                                {/* Company Overview */}
                                                <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 animate-in fade-in slide-in-from-top-2 duration-500 delay-100">
                                                    <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">Company Overview</h3>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                                        {companySummaries[company.name?.toLowerCase()] || 'Generating overview...'}
                                                    </p>
                                                </div>
                                                
                                                {/* Jobs List */}
                                                {companyJobsList.length === 0 ? (
                                                    <p className="text-gray-600 dark:text-gray-400">No active jobs found for this company.</p>
                                                ) : (
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Available Positions</h3>
                                                        <div className="space-y-4">
                                                            {companyJobsList.map((job, index) => {
                                                                const isJobExpanded = expandedJobs.includes(job.id);
                                                                return (
                                                                    <div
                                                                        key={job.id || index}
                                                                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                                                                    >
                                                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{job.title}</h4>
                                                                        
                                                                        {/* Expanded job details */}
                                                                        <div 
                                                                            className={`mb-4 overflow-hidden transition-all duration-500 ease-in-out ${
                                                                                isJobExpanded 
                                                                                    ? 'max-h-[1000px] opacity-100' 
                                                                                    : 'max-h-0 opacity-0'
                                                                            }`}
                                                                        >
                                                                            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                                                                <h5 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-3">About the Role</h5>
                                                                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                                                                                    {jobSummaries[job.id]?.role || job.roleSummary || 'Loading summary...'}
                                                                                </p>
                                                                                
                                                                                {/* Company Fast Facts */}
                                                                                {(() => {
                                                                                    const companyKey = job.company?.toLowerCase();
                                                                                    const facts = companyFastFacts[companyKey];
                                                                                    if (!facts) {
                                                                                        return (
                                                                                            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                                                                                Loading company facts...
                                                                                            </div>
                                                                                        );
                                                                                    }
                                                                                    
                                                                                    return (
                                                                                        <>
                                                                                            <h5 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-3">Company Fast Facts</h5>
                                                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                                                                {facts.headcount && (
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                                                                                                            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                                                            </svg>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Headcount</p>
                                                                                                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{facts.headcount.toLocaleString()}</p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                {facts.fundingStage && (
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                                                                                                            <svg className="w-5 h-5 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                                            </svg>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Stage</p>
                                                                                                            <p className="text-sm font-bold text-green-600 dark:text-green-400">{facts.fundingStage}</p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                {facts.hq && (
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                                                                                                            <svg className="w-5 h-5 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                                            </svg>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">HQ</p>
                                                                                                            <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{facts.hq}</p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                {facts.workModel && (
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                                                                                                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                                                                            </svg>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Work Model</p>
                                                                                                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{facts.workModel}</p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div className="flex flex-col sm:flex-row gap-3">
                                                                            <button
                                                                                onClick={() => handleLearnMore(job)}
                                                                                className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 cursor-pointer font-medium text-sm transition-colors"
                                                                            >
                                                                                {isJobExpanded ? 'Show Less' : 'Learn More'}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => trackJobClick(job.id, job.link, db)}
                                                                                className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 cursor-pointer font-medium text-sm transition-colors"
                                                                            >
                                                                                Apply Now
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ENHANCED EMPLOYER DASHBOARD
    if (isEmployerLoggedIn && showDashboard) {
        // Check if user is whitelisted admin - admins see all jobs without companyId
        const userIsWhitelisted = user?.email && isWhitelistedAdmin(user.email);
        
        // Filter jobs: whitelisted admins see all jobs without companyId, others see only their company's jobs
        const employerJobs = jobs.filter(job => {
            // Whitelisted admins see all jobs that don't have a companyId assigned yet (empty string or undefined)
            if (userIsWhitelisted) {
                // Admin sees jobs without companyId (empty string, null, or undefined) OR jobs with their companyId if they have one
                const hasNoCompanyId = !job.companyId || job.companyId === '' || job.companyId === null;
                const matchesCompany = companyData?.id && job.companyId === companyData.id;
                return hasNoCompanyId || matchesCompany;
            }
            
            // Regular users only see jobs for their company
            if (!companyData?.id) {
                console.warn('⚠️ No companyData.id - filtering out all jobs');
                return false;
            }
            return job.companyId === companyData.id;
        });
        
        console.log('📊 Dashboard jobs filter:', {
            totalJobs: jobs.length,
            companyId: companyData?.id,
            companyName: companyData?.name,
            filteredJobs: employerJobs.length,
            isWhitelisted: userIsWhitelisted,
            userEmail: user?.email
        });
        
        // Calculate aggregate stats
        const totalLearnMoreClicks = employerJobs.reduce((sum, job) => sum + (job.learnMoreClicks || 0), 0);
        const totalClicks = employerJobs.reduce((sum, job) => sum + (job.totalClicks || 0), 0);
        
        // Don't redirect - show form inline in dashboard
        // Removed the early return for showJobForm - form will render inline below
        
        // Calculate stats
        const totalViews = employerJobs.reduce((sum, job) => sum + (job.learnMoreClicks || 0), 0);
        const clickRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0;
        
        // Regular dashboard view WITH ANALYTICS
        // Ensure whitelisted admins have admin status set
        const userIsWhitelistedAdmin = user?.email && isWhitelistedAdmin(user.email);
        if (userIsWhitelistedAdmin && !isAdmin) {
            console.log('🔐 Setting admin status for whitelisted user:', user.email);
            setIsAdmin(true);
        }
        
        return (
            <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200`}>
                <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 transition-colors duration-200">
                    <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3 logo-container">
                            <svg width="360" height="65" viewBox="0 0 360 65" className="h-14 w-auto max-w-full sm:h-16" xmlns="http://www.w3.org/2000/svg">
                                <rect x="0" y="8" width="52" height="52" rx="6" fill="#4F46E5"/>
                                <text x="26" y="36" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" fill="white" textAnchor="middle" dominantBaseline="central">PC</text>
                                <text x="65" y="28" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="700" fill="#1F2937" className="logo-text" dominantBaseline="central">Partnerships Careers</text>
                                <text x="65" y="46" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="500" fill="#6B7280" className="logo-tagline" dominantBaseline="central">Find Your Next Partnership Role</text>
                            </svg>
                        </div>
                        <div className="flex gap-4 items-center">
                            {/* Dark Mode Toggle Button */}
                            <button
                                type="button"
                                onClick={toggleDarkMode}
                                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                                aria-label="Toggle dark mode"
                            >
                                {isDarkMode ? (
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                    </svg>
                                )}
                            </button>
                            <button 
                                type="button"
                                onClick={() => setShowDashboard(false)}
                                className="bg-purple-600 dark:bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 font-medium transition-colors duration-200"
                            >
                                View Job Board
                            </button>
                            <button 
                                type="button"
                                onClick={handleLogout}
                                className="bg-red-600 dark:bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 font-medium transition-colors duration-200"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </header>
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Company Header */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6 mb-6 transition-colors duration-200">
                        <div className="flex items-center gap-4 mb-4">
                            {companyData?.logo && (
                                <img src={companyData.logo} alt={companyData.name} className="w-16 h-16 rounded object-contain" />
                            )}
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold dark:text-white">{companyData?.name || employerCompany}</h2>
                                {companyData?.website && (
                                    <a href={companyData.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm transition-colors duration-200">
                                        {companyData.website}
                                    </a>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <button 
                                type="button"
                                onClick={handlePostNewJob}
                                className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 font-medium transition-colors duration-200"
                            >
                                Post a Featured Job - $99
                            </button>
                        </div>
                    </div>
                    
                    {/* Job Posting Form - Inline Expansion */}
                    {showJobForm && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6 mb-6 transition-all duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold dark:text-white mb-2">Post Your Featured Job</h2>
                                    <p className="text-gray-600 dark:text-gray-300">Fill out the details below. Your job will be featured at the top of the job board for 30 days.</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setShowJobForm(false)}
                                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleSubmitNewJob} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Title *</label>
                                <input 
                                    type="text"
                                    value={newJobData.title}
                                    onChange={(e) => setNewJobData({...newJobData, title: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                    placeholder="e.g., Director of Channel Partnerships"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company</label>
                                <input 
                                    type="text"
                                    value={newJobData.company || employerCompany}
                                    onChange={(e) => setNewJobData({...newJobData, company: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                    placeholder={employerCompany || "Enter company name"}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Level *</label>
                                    <select 
                                        value={newJobData.level}
                                        onChange={(e) => setNewJobData({...newJobData, level: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                                        required
                                    >
                                        {LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Type *</label>
                                    <select 
                                        value={newJobData.type}
                                        onChange={(e) => setNewJobData({...newJobData, type: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                                        required
                                    >
                                        {['Full-Time', 'Part-Time', 'Contract', 'Remote'].map(type => 
                                            <option key={type} value={type}>{type}</option>
                                        )}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label>
                                <select 
                                    value={newJobData.category}
                                    onChange={(e) => setNewJobData({...newJobData, category: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                                    required
                                >
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Region *</label>
                                <select 
                                    value={newJobData.region}
                                    onChange={(e) => setNewJobData({...newJobData, region: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                                    required
                                >
                                    {REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location *</label>
                                <input 
                                    type="text"
                                    value={newJobData.location}
                                    onChange={(e) => setNewJobData({...newJobData, location: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                    placeholder="e.g., New York, NY or Remote"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Job Description *</label>
                                <textarea 
                                    value={newJobData.description}
                                    onChange={(e) => setNewJobData({...newJobData, description: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                    rows={6}
                                    placeholder="Describe the role, responsibilities, and requirements..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Application Link *</label>
                                <input 
                                    type="url"
                                    value={newJobData.link}
                                    onChange={(e) => setNewJobData({...newJobData, link: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                    placeholder="https://yourcompany.com/careers/job-id"
                                    required
                                />
                            </div>
                            
                            {/* New Optional Fields */}
                            <div className="border-t pt-6 mt-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Additional Information (Optional)</h3>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Salary Range</label>
                                        <input 
                                            type="text"
                                            value={newJobData.salaryRange}
                                            onChange={(e) => setNewJobData({...newJobData, salaryRange: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                            placeholder="e.g., $120K-$180K or Competitive"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Logo URL (Optional)</label>
                                        <input 
                                            type="url"
                                            value={newJobData.companyLogo}
                                            onChange={(e) => setNewJobData({...newJobData, companyLogo: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                            placeholder="Leave empty to auto-fetch logo"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            💡 Logo will be automatically fetched from company name if left empty. 
                                            Or provide a custom URL (recommended: 200x200px, square image)
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Stage</label>
                                        <select 
                                            value={newJobData.companyStage}
                                            onChange={(e) => setNewJobData({...newJobData, companyStage: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                                        >
                                            <option value="">Select stage...</option>
                                            <option value="Startup">Startup</option>
                                            <option value="Series A">Series A</option>
                                            <option value="Series B">Series B</option>
                                            <option value="Series C+">Series C+</option>
                                            <option value="Public">Public</option>
                                            <option value="Private">Private</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Size</label>
                                        <select 
                                            value={newJobData.companySize}
                                            onChange={(e) => setNewJobData({...newJobData, companySize: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                                        >
                                            <option value="">Select size...</option>
                                            <option value="1-10">1-10</option>
                                            <option value="11-50">11-50</option>
                                            <option value="51-200">51-200</option>
                                            <option value="201-500">201-500</option>
                                            <option value="501-1000">501-1000</option>
                                            <option value="1000+">1000+</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Benefits & Perks</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center">
                                            <input 
                                                type="checkbox"
                                                checked={newJobData.isRemote}
                                                onChange={(e) => setNewJobData({...newJobData, isRemote: e.target.checked})}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:bg-gray-700 transition-colors duration-200"
                                            />
                                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Remote Work Options</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input 
                                                type="checkbox"
                                                checked={newJobData.hasEquity}
                                                onChange={(e) => setNewJobData({...newJobData, hasEquity: e.target.checked})}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:bg-gray-700 transition-colors duration-200"
                                            />
                                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Equity Compensation</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input 
                                                type="checkbox"
                                                checked={newJobData.hasVisa}
                                                onChange={(e) => setNewJobData({...newJobData, hasVisa: e.target.checked})}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:bg-gray-700 transition-colors duration-200"
                                            />
                                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Visa Sponsorship Available</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                                {!showPaymentForm ? (
                                    <div className="flex gap-4">
                                        <button 
                                            type="submit"
                                            className="flex-1 bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 font-medium transition-colors duration-200"
                                        >
                                            Continue to Payment - $99
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setShowJobForm(false);
                                                setShowPaymentForm(false);
                                                setPaymentClientSecret(null);
                                                setPendingJobData(null);
                                            }}
                                            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors duration-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div className="border-t dark:border-gray-700 pt-6 mt-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Information</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            Complete your payment to post your featured job listing.
                                        </p>
                                        {paymentClientSecret && (
                                            <Elements stripe={stripePromise} options={{ clientSecret: paymentClientSecret }}>
                                                <PaymentForm
                                                    clientSecret={paymentClientSecret}
                                                    onSuccess={handlePaymentSuccess}
                                                    onCancel={() => {
                                                        setShowPaymentForm(false);
                                                        setPaymentClientSecret(null);
                                                        setPaymentIntentId(null);
                                                    }}
                                                    isProcessing={isProcessingPayment}
                                                    setIsProcessing={setIsProcessingPayment}
                                                />
                                            </Elements>
                                        )}
                                    </div>
                                )}
                            </form>
                        </div>
                    )}
                    
                    {/* Stats Cards */}
                    {employerJobs.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6 transition-colors duration-200">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-300 text-sm font-medium block">Learn More Views</span>
                                        <span className="text-gray-400 dark:text-gray-500 text-xs">Total "Learn More" clicks</span>
                                    </div>
                                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                        <i data-lucide="eye" className="w-5 h-5 text-indigo-600 dark:text-indigo-300"></i>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalViews.toLocaleString()}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6 transition-colors duration-200">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-300 text-sm font-medium block">Apply Now Clicks</span>
                                        <span className="text-gray-400 dark:text-gray-500 text-xs">Total "Apply Now" clicks</span>
                                    </div>
                                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                        <i data-lucide="mouse-pointer-click" className="w-5 h-5 text-green-600 dark:text-green-300"></i>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalClicks.toLocaleString()}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6 transition-colors duration-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">Click Rate</span>
                                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                        <i data-lucide="trending-up" className="w-5 h-5 text-purple-600 dark:text-purple-300"></i>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{clickRate}%</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Team Requests Section - Only visible to admins */}
                    {isAdmin && pendingAccessRequests.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6 mb-6 transition-colors duration-200 border-l-4 border-indigo-500">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-xl font-bold dark:text-white">Team Requests</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {pendingAccessRequests.length} pending request{pendingAccessRequests.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {pendingAccessRequests.map((request) => (
                                    <div key={request.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 transition-colors duration-200">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold dark:text-white">{request.requestedByName}</p>
                                                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full font-medium">
                                                        Pending
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{request.requestedByEmail}</p>
                                                {request.jobTitle && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">Title: {request.jobTitle}</p>
                                                )}
                                                {request.requestedByLinkedIn && (
                                                    <a 
                                                        href={request.requestedByLinkedIn} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                                                    >
                                                        View LinkedIn Profile →
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-600">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        // Approve access - add user to company members
                                                        const membersRef = collection(db, 'companyMembers');
                                                        
                                                        // Check if user already exists
                                                        const existingMemberQuery = query(
                                                            membersRef,
                                                            where('email', '==', request.requestedByEmail.toLowerCase())
                                                        );
                                                        const existingMemberSnapshot = await getDocs(existingMemberQuery);
                                                        
                                                        if (existingMemberSnapshot.empty) {
                                                            // Add user to company members
                                                            await addDoc(membersRef, {
                                                                companyId: request.companyId,
                                                                email: request.requestedByEmail.toLowerCase(),
                                                                firstName: request.requestedByName.split(' ')[0] || '',
                                                                lastName: request.requestedByName.split(' ').slice(1).join(' ') || '',
                                                                isAdmin: false,
                                                                joinedAt: new Date().toISOString(),
                                                            });
                                                        }
                                                        
                                                        // Update access request status
                                                        const requestRef = doc(db, 'accessRequests', request.id);
                                                        await updateDoc(requestRef, {
                                                            status: 'approved',
                                                            respondedAt: new Date().toISOString(),
                                                            respondedBy: user?.uid || '',
                                                        });
                                                        
                                                        // Remove from pending requests
                                                        setPendingAccessRequests(prev => prev.filter(r => r.id !== request.id));
                                                        
                                                        // Refresh company members
                                                        const allMembersQuery = query(membersRef, where('companyId', '==', request.companyId));
                                                        const allMembersSnapshot = await getDocs(allMembersQuery);
                                                        const members = allMembersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                                                        setCompanyMembers(members);
                                                        
                                                        // TODO: Send welcome email to new member
                                                        
                                                        alert(`✅ Access approved for ${request.requestedByName}. They can now access the employer dashboard.`);
                                                    } catch (error) {
                                                        console.error('Error approving access request:', error);
                                                        alert('Error approving access: ' + error.message);
                                                    }
                                                }}
                                                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium text-sm transition-colors duration-200"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        // Update access request status to denied
                                                        const requestRef = doc(db, 'accessRequests', request.id);
                                                        await updateDoc(requestRef, {
                                                            status: 'denied',
                                                            respondedAt: new Date().toISOString(),
                                                            respondedBy: user?.uid || '',
                                                        });
                                                        
                                                        // Remove from pending requests
                                                        setPendingAccessRequests(prev => prev.filter(r => r.id !== request.id));
                                                        
                                                        // TODO: Send rejection email
                                                        
                                                        alert(`Access request from ${request.requestedByName} has been denied.`);
                                                    } catch (error) {
                                                        console.error('Error denying access request:', error);
                                                        alert('Error denying access: ' + error.message);
                                                    }
                                                }}
                                                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium text-sm transition-colors duration-200"
                                            >
                                                Deny
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Team Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6 mb-6 transition-colors duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold dark:text-white">Team</h3>
                            {isAdmin ? (
                                <button 
                                    onClick={() => setShowTeamModal(true)}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
                                >
                                    <i data-lucide="user-plus" className="w-4 h-4 inline mr-2"></i>
                                    Invite Team Member
                                </button>
                            ) : (
                                <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                                    <div>Only admins can invite team members</div>
                                    {!isAdmin && isWhitelistedAdmin(user?.email) && (
                                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                            Note: Your email is whitelisted. Admin status should be set automatically.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            {companyMembers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-200">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium dark:text-white">{member.firstName} {member.lastName}</p>
                                            {member.isAdmin && (
                                                <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{member.email}</p>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Team Invite Modal */}
                    {showTeamModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4 transition-colors duration-200">
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-900 p-6 max-w-md w-full transition-colors duration-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold dark:text-white">Invite Team Member</h3>
                                    <button 
                                        type="button"
                                        onClick={() => setShowTeamModal(false)} 
                                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
                                    >
                                        <i data-lucide="x" className="w-5 h-5"></i>
                                    </button>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                    Send an invitation email to add a team member to your company account. 
                                    <strong className="dark:text-white"> Only users with the same email domain ({companyData?.emailDomain || getEmailDomain(user?.email)}) can be invited.</strong>
                                </p>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder={`colleague@${companyData?.emailDomain || 'company.com'}`}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Must be from the same company domain
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={async () => {
                                            if (!inviteEmail) {
                                                alert('Please enter an email address');
                                                return;
                                            }
                                            
                                            // Validate email domain matches company
                                            const inviteEmailDomain = getEmailDomain(inviteEmail);
                                            const companyEmailDomain = companyData?.emailDomain || getEmailDomain(user?.email);
                                            
                                            if (inviteEmailDomain !== companyEmailDomain) {
                                                alert(`Error: The email address must be from the same company domain (${companyEmailDomain}).\n\nYou entered: ${inviteEmailDomain}`);
                                                return;
                                            }
                                            
                                            // Check if user already exists
                                            const membersRef = collection(db, 'companyMembers');
                                            const existingMemberQuery = query(
                                                membersRef, 
                                                where('email', '==', inviteEmail.toLowerCase())
                                            );
                                            const existingMemberSnapshot = await getDocs(existingMemberQuery);
                                            
                                            if (!existingMemberSnapshot.empty) {
                                                alert('This user is already a member of your company.');
                                                setInviteEmail('');
                                                setShowTeamModal(false);
                                                return;
                                            }
                                            
                                            // In production, this would send an email with magic link
                                            // For now, just show a message
                                            alert(`Invitation would be sent to ${inviteEmail}.\n\nIn production, this would send a magic link email that allows them to sign up and automatically join your company.`);
                                            setInviteEmail('');
                                            setShowTeamModal(false);
                                        }}
                                        className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
                                    >
                                        Send Invitation
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowTeamModal(false);
                                            setInviteEmail('');
                                        }}
                                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Your Job Listings Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6 transition-colors duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold dark:text-white">Your Job Listings</h3>
                            {selectedJobs.length > 0 && (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">{selectedJobs.length} jobs selected</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => {
                                                for (const jobId of selectedJobs) {
                                                    const jobRef = doc(db, 'jobs', jobId);
                                                    await updateDoc(jobRef, { status: 'paused' });
                                                }
                                                setSelectedJobs([]);
                                                fetchJobs();
                                            }}
                                            className="text-sm bg-yellow-500 dark:bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-600 dark:hover:bg-yellow-700 transition-colors duration-200"
                                        >
                                            Pause Selected
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                for (const jobId of selectedJobs) {
                                                    const jobRef = doc(db, 'jobs', jobId);
                                                    await updateDoc(jobRef, { status: 'active' });
                                                }
                                                setSelectedJobs([]);
                                                fetchJobs();
                                            }}
                                            className="text-sm bg-green-500 dark:bg-green-600 text-white px-3 py-1 rounded hover:bg-green-600 dark:hover:bg-green-700 transition-colors duration-200"
                                        >
                                            Unpause Selected
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                for (const jobId of selectedJobs) {
                                                    const jobRef = doc(db, 'jobs', jobId);
                                                    await updateDoc(jobRef, { status: 'archived' });
                                                }
                                                setSelectedJobs([]);
                                                fetchJobs();
                                            }}
                                            className="text-sm bg-red-500 dark:bg-red-600 text-white px-3 py-1 rounded hover:bg-red-600 dark:hover:bg-red-700 transition-colors duration-200"
                                        >
                                            Archive Selected
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {employerJobs.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <p className="mb-2">No job listings found{userIsWhitelisted ? ' (Admin: shows jobs without companyId)' : ` for ${employerCompany}`}.</p>
                                <p className="text-sm">Click "Post a Featured Job" above to add your first listing!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b dark:border-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={selectedJobs.length === employerJobs.length && employerJobs.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedJobs(employerJobs.map(j => j.id));
                                            } else {
                                                setSelectedJobs([]);
                                            }
                                        }}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Select All</span>
                                </div>
                                {employerJobs.map((job, index) => {
                                    const daysRemaining = calculateDaysRemaining(job.featuredExpiryDate);
                                    const isActive = job.status === 'active' || !job.status;
                                    
                                    const ctr = (job.learnMoreClicks || 0) > 0 ? (((job.totalClicks || 0) / (job.learnMoreClicks || 1)) * 100).toFixed(1) : 0;
                                    
                                    return (
                                        <div 
                                            key={job.id || index}
                                            className={`border dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 transition-colors duration-200 ${!isActive ? 'opacity-60 bg-gray-50 dark:bg-gray-900' : ''}`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedJobs.includes(job.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedJobs([...selectedJobs, job.id]);
                                                        } else {
                                                            setSelectedJobs(selectedJobs.filter(id => id !== job.id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded mt-1"
                                                />
                                                <div className="flex-1">
                                                    {/* Job Header */}
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-lg dark:text-white mb-1">{job.title}</h4>
                                                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-white">
                                                                {job.isFeatured && (
                                                                    <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium">
                                                                        <span className="w-3 h-3 rounded-full bg-yellow-500 dark:bg-yellow-400 flex items-center justify-center">
                                                                            <span className="text-white text-[8px] font-bold">★</span>
                                                                        </span>
                                                                        Featured
                                                                    </span>
                                                                )}
                                                                <span className="dark:text-white">{job.level}</span>
                                                                <span className="dark:text-white">•</span>
                                                                <span className="dark:text-white">{job.location}</span>
                                                                {!isActive && <span className="text-red-600 dark:text-red-400 font-medium">• Paused</span>}
                                                            </div>
                                                            {job.isFeatured && daysRemaining !== null && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                    {daysRemaining > 0 ? 
                                                                        `${daysRemaining} days remaining` :
                                                                        'Featured period expired'
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Analytics Stats */}
                                                    <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-200">
                                                        <div>
                                                            <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Learn More</p>
                                                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{(job.learnMoreClicks || 0).toLocaleString()}</p>
                                                            <p className="text-xs text-gray-400 dark:text-gray-500">views</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Apply Now</p>
                                                            <p className="text-lg font-bold text-green-600 dark:text-green-400">{(job.totalClicks || 0).toLocaleString()}</p>
                                                            <p className="text-xs text-gray-400 dark:text-gray-500">clicks</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">CTR</p>
                                                            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{ctr}%</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Days Left</p>
                                                            <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{daysRemaining !== null ? daysRemaining : '-'}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Action Buttons */}
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                const jobRef = doc(db, 'jobs', job.id);
                                                                await updateDoc(jobRef, { status: isActive ? 'paused' : 'active' });
                                                                fetchJobs();
                                                            }}
                                                            className="text-sm bg-gray-500 dark:bg-gray-600 text-white px-3 py-1.5 rounded hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors duration-200"
                                                        >
                                                            {isActive ? 'Pause' : 'Unpause'}
                                                        </button>
                                                        <a
                                                            href={job.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium px-3 py-1.5 transition-colors duration-200"
                                                        >
                                                            View →
                                                        </a>
                                                        {!job.isFeatured && (
                                                            <button 
                                                                type="button"
                                                                className="text-sm bg-yellow-500 dark:bg-yellow-600 text-white px-3 py-1.5 rounded hover:bg-yellow-600 dark:hover:bg-yellow-700 transition-colors duration-200"
                                                                onClick={() => handlePromoteJob(job)}
                                                            >
                                                                Feature this listing - $99
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    
    // Company Career Page
    if (showCompanyPage && companyData) {
        const companyJobs = jobs.filter(job => job.companyId === companyData.id && job.status === 'active');
        
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
                <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 transition-colors duration-200">
                    <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                        <button 
                            onClick={() => setShowCompanyPage(false)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                        >
                            ← Back to Dashboard
                        </button>
                        <button 
                            onClick={() => setShowDashboard(false)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        >
                            View Job Board
                        </button>
                    </div>
                </header>
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Company Header */}
                    <div className="bg-white rounded-lg shadow p-8 mb-8 text-center">
                        {companyData.logo && (
                            <img src={companyData.logo} alt={companyData.name} className="w-24 h-24 rounded object-contain mx-auto mb-4" />
                        )}
                        <h1 className="text-4xl font-bold mb-2">{companyData.name}</h1>
                        {companyData.website && (
                            <a href={companyData.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700">
                                {companyData.website}
                            </a>
                        )}
                    </div>
                    
                    {/* Jobs Grid */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold mb-4">Open Positions</h2>
                        {companyJobs.length === 0 ? (
                            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                                <p>No active job listings at this time.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {companyJobs.map((job) => {
                                    const postedDate = job.postedDate ? new Date(job.postedDate) : new Date();
                                    const today = new Date();
                                    const diffDays = Math.floor((today - postedDate) / (1000 * 60 * 60 * 24));
                                    
                                    return (
                                        <div key={job.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                                            <h3 className="text-xl font-bold mb-2">{job.title}</h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                                <span>{job.level}</span>
                                                <span>•</span>
                                                <span>{job.location}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                                <span>{job.company}</span>
                                                <span>•</span>
                                                <span>{job.type || 'Full-Time'}</span>
                                                {job.salaryRange && job.salaryRange !== 'Competitive' && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-green-600 dark:text-green-400 font-medium">{job.salaryRange}</span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
                                                    {job.category}
                                                </span>
                                                {job.isRemote && (
                                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
                                                        Remote
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => trackJobClick(job.id, job.link, db)}
                                                    className="flex-1 bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 font-medium text-sm transition-colors duration-200"
                                                >
                                                    Apply Now
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                                                Posted {diffDays === 0 ? 'today' : `${diffDays} days ago`}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    
    // Forgot Password page
    if (showForgotPassword) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-200">
                <div className="max-w-md w-full">
                    <div className="text-center mb-8">
                        <button 
                            onClick={() => {
                                setShowForgotPassword(false);
                                setResetEmailSent(false);
                            }}
                            className="text-indigo-600 hover:text-indigo-700 mb-4 inline-block"
                        >
                            ← Back to Login
                        </button>
                        <div className="flex items-center gap-3 mb-2">
                            <img 
                                src="/logo-icon.svg" 
                                alt="PC" 
                                className="h-10 w-10"
                            />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Partnerships Careers</h1>
                                <p className="text-gray-600 text-sm">Reset Your Password</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-lg p-8">
                        {!resetEmailSent ? (
                            <>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Forgot Password?</h2>
                                <p className="text-gray-600 mb-6">
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.target);
                                        const email = formData.get('email');
                                        await handleForgotPassword(email);
                                    }}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                        <input 
                                            type="email"
                                            name="email"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="you@company.com"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium"
                                    >
                                        Send Reset Link
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="text-center">
                                <div className="mb-4">
                                    <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h2>
                                <p className="text-gray-600 mb-6">
                                    We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                    Didn't receive the email? Check your spam folder or try again in a few minutes.
                                </p>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            setShowForgotPassword(false);
                                            setResetEmailSent(false);
                                        }}
                                        className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium"
                                    >
                                        Back to Login
                                    </button>
                                    <button
                                        onClick={() => setResetEmailSent(false)}
                                        className="w-full text-indigo-600 hover:text-indigo-700 font-medium py-2"
                                    >
                                        Send Another Email
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Employer Login/Signup page
    if (showEmployerLogin) {
        return (
            <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-200`}>
                <div className="max-w-md w-full">
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <button 
                                type="button"
                                onClick={() => setShowEmployerLogin(false)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-block transition-colors duration-200"
                            >
                                ← Back to Jobs
                            </button>
                            <button
                                type="button"
                                onClick={toggleDarkMode}
                                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                                aria-label="Toggle dark mode"
                            >
                                {isDarkMode ? (
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <img 
                                src="/logo-icon.svg" 
                                alt="PC" 
                                className="h-10 w-10"
                            />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Partnerships Careers</h1>
                                <p className="text-gray-600 dark:text-gray-300 text-sm">Employer Portal</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-900 p-8 transition-colors duration-200">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {isSignUp ? 'Create Employer Account' : 'Employer Login'}
                        </h2>
                        <form 
                            className="space-y-4 mb-6"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                console.log('📝 Form submitted');
                                
                                const formData = new FormData(e.target);
                                const emailInput = formData.get('email');
                                const passwordInput = formData.get('password');
                                const company = formData.get('company');
                                const firstName = formData.get('firstName');
                                const lastName = formData.get('lastName');
                                const website = formData.get('website');
                                
                                if (isSignUp) {
                                    if (!firstName || firstName.trim() === '') {
                                        alert('Please enter your first name');
                                        return false;
                                    }
                                    if (!company || company.trim() === '') {
                                        alert('Please enter your company name');
                                        return false;
                                    }
                                    if (!passwordInput || passwordInput.trim() === '') {
                                        alert('Please enter a password');
                                        return false;
                                    }
                                    if (passwordInput.length < 6) {
                                        alert('Password must be at least 6 characters long');
                                        return false;
                                    }
                                    console.log('📝 Calling handleSignUp');
                                    await handleSignUp(emailInput, firstName, lastName, company, website, passwordInput);
                                } else {
                                    console.log('📝 Calling handleLogin - using Firebase email/password authentication');
                                    await handleLogin(emailInput, passwordInput);
                                }
                                
                                return false; // Prevent any form submission
                            }}
                        >
                            {isSignUp && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name</label>
                                        <input 
                                            type="text"
                                            name="firstName"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                            placeholder="John"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
                                        <input 
                                            type="text"
                                            name="lastName"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                                <input 
                                    type="email"
                                    name="email"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                    placeholder="you@company.com"
                                    required
                                />
                                {isSignUp && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Company email is required. Personal email addresses (Gmail, Yahoo, etc.) are not allowed.
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                                <input 
                                    type="password"
                                    name="password"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                    placeholder={isSignUp ? "Create a password (min 6 characters)" : "Enter your password"}
                                    required
                                />
                                {!isSignUp && (
                                    <div className="mt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowForgotPassword(true);
                                                setResetEmailSent(false);
                                            }}
                                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors duration-200"
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                )}
                            </div>
                            {isSignUp && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Name *</label>
                                        <input 
                                            type="text"
                                            name="company"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                            placeholder="Your Company"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Website (Optional)</label>
                                        <input 
                                            type="url"
                                            name="website"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors duration-200"
                                            placeholder="https://yourcompany.com"
                                        />
                                    </div>
                                </>
                            )}
                            <button 
                                type="submit"
                                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium"
                            >
                                {isSignUp ? 'Sign Up' : 'Log In'}
                            </button>
                        </form>
                        {/* LinkedIn Sign-In - Primary method for employers */}
                        {isSignUp && (
                            <>
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or sign up with</span>
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <button 
                                        onClick={handleLinkedInSignIn}
                                        disabled={linkedinAuthLoading}
                                        type="button"
                                        className="w-full bg-[#0A66C2] hover:bg-[#084d94] text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                    >
                                        {linkedinAuthLoading ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                                </svg>
                                                Sign Up with LinkedIn
                                            </>
                                        )}
                                    </button>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                                        Employers must sign up with LinkedIn for verification
                                    </p>
                                </div>
                            </>
                        )}
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('🔵 Google button clicked');
                                    console.log('🔵 Event:', e);
                                    console.log('🔵 handleGoogleSignIn type:', typeof handleGoogleSignIn);
                                    try {
                                        await handleGoogleSignIn();
                                    } catch (err) {
                                        console.error('🔵 Error in button handler:', err);
                                    }
                                }}
                                type="button"
                                className="bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google
                            </button>
                            <button 
                                onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('🔵 Microsoft button clicked');
                                    console.log('🔵 Event:', e);
                                    console.log('🔵 handleMicrosoftSignIn type:', typeof handleMicrosoftSignIn);
                                    try {
                                        await handleMicrosoftSignIn();
                                    } catch (err) {
                                        console.error('🔵 Error in button handler:', err);
                                    }
                                }}
                                type="button"
                                className="bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 23 23">
                                    <path fill="#f25022" d="M0 0h10.5v10.5H0z"/>
                                    <path fill="#00a4ef" d="M12.5 0H23v10.5H12.5z"/>
                                    <path fill="#7fba00" d="M0 12.5h10.5V23H0z"/>
                                    <path fill="#ffb900" d="M12.5 12.5H23V23H12.5z"/>
                                </svg>
                                Microsoft
                            </button>
                        </div>
                        <div className="mt-6 text-center text-sm">
                            <button 
                                onClick={() => setIsSignUp(!isSignUp)}
                                type="button"
                                className="text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Request Access Modal (when company already exists)
    if (showRequestAccessModal && existingCompanyInfo && linkedinUserData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-200">
                <div className="max-w-md w-full">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-900 p-8 transition-colors duration-200">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            {existingCompanyInfo.name} Already Has an Employer Account
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Your recruiting team is already here. Request access to join them.
                        </p>
                        
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Current Admin:</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {existingCompanyInfo.claimedByEmail || 'Email not available'}
                            </p>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Your Information:</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{linkedinUserData.firstName} {linkedinUserData.lastName}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{linkedinUserData.email}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{linkedinUserData.jobTitle}</p>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={async () => {
                                    try {
                                        // Create access request
                                        const accessRequestsRef = collection(db, 'accessRequests');
                                        await addDoc(accessRequestsRef, {
                                            companyId: existingCompanyInfo.id,
                                            companyName: existingCompanyInfo.name,
                                            requestedByEmail: linkedinUserData.email.toLowerCase(),
                                            requestedByName: `${linkedinUserData.firstName} ${linkedinUserData.lastName}`.trim(),
                                            requestedByLinkedIn: linkedinUserData.profileUrl || '',
                                            jobTitle: linkedinUserData.jobTitle || '',
                                            status: 'pending',
                                            createdAt: new Date().toISOString(),
                                        });
                                        
                                        // TODO: Send email to admins (will be implemented)
                                        
                                        alert(`Access request sent to ${existingCompanyInfo.name} administrators.\n\nYou'll receive an email when they respond.\n\nTypically takes 1-2 business days.`);
                                        
                                        setShowRequestAccessModal(false);
                                        setLinkedinUserData(null);
                                        setExistingCompanyInfo(null);
                                        setShowEmployerLogin(false);
                                    } catch (error) {
                                        console.error('Error creating access request:', error);
                                        alert('Error sending access request: ' + error.message);
                                    }
                                }}
                                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-medium transition-colors duration-200"
                            >
                                Request Access
                            </button>
                            <button
                                onClick={() => {
                                    setShowRequestAccessModal(false);
                                    setLinkedinUserData(null);
                                    setExistingCompanyInfo(null);
                                    setShowEmployerLogin(true);
                                }}
                                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main job board
    return (
        <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200`}>
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 transition-colors duration-200">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 logo-container">
                            <svg width="360" height="65" viewBox="0 0 360 65" className="h-14 w-auto max-w-full sm:h-16" xmlns="http://www.w3.org/2000/svg">
                                <rect x="0" y="8" width="52" height="52" rx="6" fill="#4F46E5"/>
                                <text x="26" y="36" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" fill="white" textAnchor="middle" dominantBaseline="central">PC</text>
                                <text x="65" y="28" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="700" fill="#1F2937" className="logo-text" dominantBaseline="central">Partnerships Careers</text>
                                <text x="65" y="46" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="500" fill="#6B7280" className="logo-tagline" dominantBaseline="central">Find Your Next Partnership Role</text>
                            </svg>
                        </div>
                        <div className="flex gap-4 items-center">
                            {/* Dark Mode Toggle Button */}
                            <button
                                type="button"
                                onClick={toggleDarkMode}
                                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                                aria-label="Toggle dark mode"
                            >
                                {isDarkMode ? (
                                    <svg className="w-5 h-5 text-white dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                    </svg>
                                )}
                            </button>
                            {isEmployerLoggedIn ? (
                                <>
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowDashboard(true);
                                        }}
                                        className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors duration-200"
                                    >
                                        Dashboard
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleLogout();
                                        }}
                                        className="bg-red-600 dark:bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-600 font-medium transition-colors duration-200"
                                    >
                                        Log Out
                                    </button>
                                </>
                            ) : (
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('Employer login button clicked');
                                        setShowEmployerLogin(true);
                                    }}
                                    className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors duration-200"
                                >
                                    Employer Login
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-800 dark:to-purple-800 text-white py-16 transition-colors duration-200">
                <div className="max-w-7xl mx-auto px-4">
                    <h1 className="text-5xl font-bold mb-4">Your Career in Partnerships Starts Here</h1>
                    <p className="text-xl mb-6">Connect with top companies hiring for partnership roles.</p>
                    <div className="rounded-lg p-6 mb-6 max-w-2xl relative" style={{ position: 'relative' }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '0.5rem',
                            zIndex: 0,
                            pointerEvents: 'none'
                        }}></div>
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div className="flex items-center gap-2 mb-3">
                                <i data-lucide="bell" className="w-5 h-5"></i>
                                <h3 className="font-bold">Get Job Alerts</h3>
                            </div>
                            <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row gap-2 relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="flex-1 px-4 py-3 rounded-lg text-gray-900 dark:text-gray-100 dark:bg-gray-700 dark:placeholder-gray-400 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                                />
                                <button
                                    ref={signupButtonRef}
                                    type="button"
                                    id="job-alert-signup-button"
                                    disabled={!email || alertSubmitting}
                                    onClick={async () => {
                                        if (!email) return;
                                        
                                        // If realtime, don't submit here - checkout expander handles it
                                        if (alertFrequency === 'realtime') {
                                            if (!showRealtimeCheckout) {
                                                setShowRealtimeCheckout(true);
                                            }
                                            return;
                                        }
                                        
                                        setAlertSubmitting(true);
                                        try {
                                            const response = await fetch('/api/subscribe-job-alerts', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    email: email,
                                                    frequency: alertFrequency
                                                })
                                            });

                                            if (!response.ok) {
                                                const errorData = await response.text();
                                                let errorMessage = 'Failed to subscribe';
                                                try {
                                                    const parsed = JSON.parse(errorData);
                                                    errorMessage = parsed.error || errorMessage;
                                                } catch {
                                                    errorMessage = errorData || errorMessage;
                                                }
                                                throw new Error(errorMessage);
                                            }

                                            const data = await response.json();

                                            alert(`✅ Thanks! We'll send ${alertFrequency} alerts to ${email}. Check your inbox for confirmation!`);

                                            setEmail('');
                                            setAlertFrequency('weekly');
                                            setShowRealtimeCheckout(false);
                                        } catch (error) {
                                            console.error('Error subscribing to alerts:', error);
                                            alert('Error: ' + error.message);
                                        } finally {
                                            setAlertSubmitting(false);
                                        }
                                    }}
                                    style={{
                                        backgroundColor: '#f59e0b',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        whiteSpace: 'nowrap',
                                        boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.3), 0 4px 6px -2px rgba(245, 158, 11, 0.2)',
                                        cursor: (!email || alertSubmitting) ? 'not-allowed' : 'pointer',
                                        opacity: (!email || alertSubmitting) ? 0.5 : 1,
                                        position: 'relative',
                                        zIndex: 99999,
                                        isolation: 'isolate',
                                        transform: 'translateZ(0)',
                                        mixBlendMode: 'normal',
                                        filter: 'none',
                                        WebkitAppearance: 'none',
                                        MozAppearance: 'none',
                                        appearance: 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!e.currentTarget.disabled) {
                                            e.currentTarget.style.backgroundColor = '#d97706';
                                            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(217, 119, 6, 0.4), 0 10px 10px -5px rgba(217, 119, 6, 0.2)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!e.currentTarget.disabled) {
                                            e.currentTarget.style.backgroundColor = '#f59e0b';
                                            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(245, 158, 11, 0.3), 0 4px 6px -2px rgba(245, 158, 11, 0.2)';
                                        }
                                    }}
                                >
                                    {alertSubmitting ? 'Subscribing...' : 'Sign Up'}
                                </button>
                            </div>
                            {email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
                                <div className="space-y-2 pt-2">
                                    <label className="block text-sm font-medium text-white mb-3">Alert Frequency:</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setAlertFrequency('daily')}
                                            className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer text-left ${
                                                alertFrequency === 'daily' 
                                                    ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white' 
                                                    : 'bg-white/10 dark:bg-white/10 border-white/20 dark:border-white/20 text-white hover:bg-white/20 dark:hover:bg-white/20'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                    alertFrequency === 'daily' 
                                                        ? 'bg-white/20' 
                                                        : 'bg-indigo-100 dark:bg-indigo-900/40'
                                                }`}>
                                                    <svg className={`w-5 h-5 ${
                                                        alertFrequency === 'daily' 
                                                            ? 'text-white' 
                                                            : 'text-indigo-600 dark:text-indigo-300'
                                                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm sm:text-base font-semibold">Daily</span>
                                            </div>
                                            <p className="text-xs sm:text-sm opacity-90">Get new jobs every day</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAlertFrequency('weekly')}
                                            className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer text-left ${
                                                alertFrequency === 'weekly' 
                                                    ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white' 
                                                    : 'bg-white/10 dark:bg-white/10 border-white/20 dark:border-white/20 text-white hover:bg-white/20 dark:hover:bg-white/20'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                    alertFrequency === 'weekly' 
                                                        ? 'bg-white/20' 
                                                        : 'bg-green-100 dark:bg-green-900/40'
                                                }`}>
                                                    <svg className={`w-5 h-5 ${
                                                        alertFrequency === 'weekly' 
                                                            ? 'text-white' 
                                                            : 'text-green-600 dark:text-green-300'
                                                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm sm:text-base font-semibold">Weekly</span>
                                            </div>
                                            <p className="text-xs sm:text-sm opacity-90">Free weekly digest</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAlertFrequency('realtime');
                                                if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                                                    setShowRealtimeCheckout(true);
                                                }
                                            }}
                                            className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer text-left ${
                                                alertFrequency === 'realtime' 
                                                    ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white' 
                                                    : 'bg-white/10 dark:bg-white/10 border-white/20 dark:border-white/20 text-white hover:bg-white/20 dark:hover:bg-white/20'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                    alertFrequency === 'realtime' 
                                                        ? 'bg-white/20' 
                                                        : 'bg-purple-100 dark:bg-purple-900/40'
                                                }`}>
                                                    <svg className={`w-5 h-5 ${
                                                        alertFrequency === 'realtime' 
                                                            ? 'text-white' 
                                                            : 'text-purple-600 dark:text-purple-300'
                                                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                    </svg>
                                                </div>
                                                <span className="text-sm sm:text-base font-semibold">Realtime</span>
                                            </div>
                                            <p className="text-xs sm:text-sm opacity-90">$5/month - Instant</p>
                                        </button>
                                    </div>
                                    {showRealtimeCheckout && alertFrequency === 'realtime' && (
                                        <div className="mt-4 p-4 bg-white/10 dark:bg-white/10 rounded-lg border border-white/20">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-semibold text-white">Realtime Alerts - $5/month</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowRealtimeCheckout(false);
                                                        setRealtimeClientSecret(null);
                                                        setRealtimeSubscriptionId(null);
                                                    }}
                                                    className="text-white/70 hover:text-white"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-200 mb-4">Get instant notifications when new partnership jobs are posted. Complete checkout to activate.</p>
                                            
                                            {!realtimeClientSecret ? (
                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            if (!email) return;
                                                            setAlertSubmitting(true);
                                                            
                                                            try {
                                                                const response = await fetch('/api/create-realtime-subscription', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ email: email })
                                                                });

                                                                let data;
                                                                const contentType = response.headers.get('content-type');
                                                                
                                                                if (contentType && contentType.includes('application/json')) {
                                                                    data = await response.json();
                                                                } else {
                                                                    const text = await response.text();
                                                                    throw new Error(`Server returned invalid response. Expected JSON but got: ${text.substring(0, 100)}`);
                                                                }

                                                                if (!response.ok) {
                                                                    throw new Error(data.error || data.message || 'Failed to create subscription');
                                                                }

                                                                if (!data.clientSecret) {
                                                                    throw new Error('No client secret received from server');
                                                                }

                                                                setRealtimeClientSecret(data.clientSecret);
                                                                setRealtimeSubscriptionId(data.subscriptionId);
                                                            } catch (error) {
                                                                console.error('Error creating subscription:', error);
                                                                alert('Error: ' + (error.message || 'Failed to create subscription. Please try again.'));
                                                            } finally {
                                                                setAlertSubmitting(false);
                                                            }
                                                        }}
                                                        disabled={alertSubmitting}
                                                        className="w-full bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {alertSubmitting ? (
                                                            <span className="flex items-center justify-center gap-2">
                                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                Loading payment form...
                                                            </span>
                                                        ) : (
                                                            <span>
                                                                <span className="hidden sm:inline">Continue to Payment →</span>
                                                                <span className="sm:hidden">Continue →</span>
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <Elements 
                                                    stripe={stripePromise} 
                                                    options={{ 
                                                        clientSecret: realtimeClientSecret,
                                                        appearance: {
                                                            theme: isDarkMode ? 'night' : 'stripe',
                                                            variables: {
                                                                colorPrimary: '#4F46E5',
                                                            }
                                                        },
                                                        loader: 'auto',
                                                        locale: 'en'
                                                    }}
                                                >
                                                    <SubscriptionPaymentForm
                                                        clientSecret={realtimeClientSecret}
                                                        onSuccess={async (paymentIntentId) => {
                                                            // Payment succeeded - webhook will activate subscription
                                                            // Give webhook a moment to process, then show success
                                                            setTimeout(() => {
                                                                alert('✅ Successfully subscribed to realtime alerts! You\'ll receive instant notifications when new jobs are posted.');
                                                                setEmail('');
                                                                setAlertFrequency('weekly');
                                                                setShowRealtimeCheckout(false);
                                                                setRealtimeClientSecret(null);
                                                                setRealtimeSubscriptionId(null);
                                                            }, 1000);
                                                        }}
                                                        onCancel={() => {
                                                            setRealtimeClientSecret(null);
                                                            setRealtimeSubscriptionId(null);
                                                        }}
                                                        isProcessing={alertSubmitting}
                                                        setIsProcessing={setAlertSubmitting}
                                                    />
                                                </Elements>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                const featuredSection = document.getElementById('featured-jobs-section');
                                if (featuredSection) {
                                    featuredSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }}
                            className="bg-white/10 dark:bg-white/20 px-4 py-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/30 transition-colors duration-200 cursor-pointer text-left"
                        >
                            <div className="text-2xl font-bold">{jobs.length}</div>
                            <div>Active Jobs</div>
                        </button>
                        <button
                            onClick={async () => {
                                await fetchAllCompanies();
                                setShowCompaniesPage(true);
                            }}
                            className="bg-white/10 dark:bg-white/20 px-4 py-2 rounded-lg hover:bg-white/20 dark:hover:bg-white/30 transition-colors duration-200 cursor-pointer text-left"
                        >
                            <div className="text-2xl font-bold">{new Set(jobs.map(j => j.company)).size}</div>
                            <div>Companies</div>
                        </button>
                    </div>
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6 mb-8 transition-colors duration-200">
                    <div className="flex justify-between mb-6">
                        <h3 className="font-bold dark:text-white">Filter Jobs</h3>
                        <button 
                            type="button"
                            onClick={fetchJobs} 
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-2 transition-colors duration-200"
                        >
                            <i data-lucide="refresh-cw" className="w-4 h-4"></i>
                            Refresh
                        </button>
                    </div>
                    <div className="mb-6">
                        <h3 className="text-sm font-bold mb-3 dark:text-gray-300">FILTER BY ROLE LEVEL</h3>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedLevel('All')}
                                className={selectedLevel === 'All' ? 'px-5 py-2 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white' : 'px-5 py-2 rounded-full bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}
                            >
                                All Levels
                            </button>
                            {LEVELS.map(level => 
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setSelectedLevel(level)}
                                    className={selectedLevel === level ? 'px-5 py-2 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white' : 'px-5 py-2 rounded-full bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}
                                >
                                    {level}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="mb-6">
                        <h3 className="text-sm font-medium mb-3 dark:text-gray-300">FILTER BY PARTNERSHIP TYPE</h3>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedCategory('All')}
                                className={selectedCategory === 'All' ? 'px-5 py-2 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white' : 'px-5 py-2 rounded-full bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}
                            >
                                All Categories
                            </button>
                            {CATEGORIES.map(cat => 
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={selectedCategory === cat ? 'px-5 py-2 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white' : 'px-5 py-2 rounded-full bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}
                                >
                                    {cat}
                                </button>
                            )}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium mb-3 dark:text-gray-300">FILTER BY REGION</h3>
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedRegion('All')}
                                className={selectedRegion === 'All' ? 'px-5 py-2 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white' : 'px-5 py-2 rounded-full bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}
                            >
                                All Regions
                            </button>
                            {REGIONS.map(region => 
                                <button
                                    key={region}
                                    type="button"
                                    onClick={() => setSelectedRegion(region)}
                                    className={selectedRegion === region ? 'px-5 py-2 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white' : 'px-5 py-2 rounded-full bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}
                                >
                                    {region}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                {loading && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900 p-6 text-center text-gray-500 dark:text-gray-400 transition-colors duration-200">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Loading jobs...</span>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded mb-4 text-sm text-red-700 dark:text-red-400 transition-colors duration-200">
                        {error}
                    </div>
                )}
                {(jobs.length > 0 || !loading) && (
                    <>
                        {featuredJobs.length > 0 && (
                            <div id="featured-jobs-section" className="mb-8 scroll-mt-8">
                                <h2 className="text-2xl font-bold mb-4 dark:text-white">⭐ Featured Jobs</h2>
                                {featuredJobs.map((job, index) => {
                                    const postedDate = job.postedDate ? new Date(job.postedDate) : new Date();
                                    const today = new Date();
                                    const diffDays = Math.floor((today - postedDate) / (1000 * 60 * 60 * 24));
                                    const isNew = diffDays <= 3;
                                    
                                    return (
                                        <div key={job.id || index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900 p-0 mb-4 border-2 border-yellow-400 dark:border-yellow-500 relative overflow-hidden transition-colors duration-200">
                                            <div className="flex flex-col sm:flex-row">
                                                {/* Left: Logo Section */}
                                                <div className="flex-shrink-0 w-full sm:w-36 p-4 sm:p-6 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                                                    {job.companyLogo ? (
                                                        <img 
                                                            src={job.companyLogo}
                                                            alt={job.company}
                                                            className="w-28 h-16 object-contain mx-auto"
                                                            style={{ 
                                                                display: 'block', 
                                                                margin: '0 auto', 
                                                                objectPosition: 'center',
                                                                imageRendering: 'crisp-edges',
                                                                WebkitImageRendering: '-webkit-optimize-contrast'
                                                            }}
                                                            onError={(e) => {
                                                                // For admin accounts, try to reload the PC logo
                                                                const normalizedName = (job.company || '').toLowerCase().trim();
                                                                const isAdminAccount = normalizedName.includes('admin') && (
                                                                    normalizedName.includes('1255') || 
                                                                    normalizedName.includes('partnerships') || 
                                                                    normalizedName.includes('careers')
                                                                );
                                                                if (isAdminAccount && job.companyLogo !== '/logo-icon.svg') {
                                                                    e.target.src = '/logo-icon.svg';
                                                                    return;
                                                                }
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div 
                                                        className={`w-28 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center rounded ${job.companyLogo ? 'hidden' : ''}`}
                                                    >
                                                        <img 
                                                            src="/logo-icon.svg" 
                                                            alt="PC Logo" 
                                                            className="w-12 h-12 object-contain mx-auto"
                                                            style={{ 
                                                                display: 'block', 
                                                                margin: '0 auto',
                                                                imageRendering: 'crisp-edges',
                                                                WebkitImageRendering: '-webkit-optimize-contrast'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                {/* Divider */}
                                                <div className="hidden sm:block w-px bg-gray-200 dark:bg-gray-700"></div>
                                                
                                                {/* Right: Content Section */}
                                                <div className="flex-1 p-4 sm:p-6">
                                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-2.5 pr-2">{job.title}</h3>
                                                            
                                                            {/* Details Line */}
                                                            <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3 flex-wrap">
                                                                <span>{job.company}</span>
                                                                <span>·</span>
                                                                <span>{job.type || 'Full-Time'}</span>
                                                                {job.location ? (
                                                                    <>
                                                                        <span>·</span>
                                                                        <span>{job.location}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>·</span>
                                                                        <span>Unspecified</span>
                                                                    </>
                                                                )}
                                                                {job.salaryRange && job.salaryRange !== 'Competitive' && job.salaryRange !== 'Unspecified' ? (
                                                                    <>
                                                                        <span>·</span>
                                                                        <span className="text-green-600 font-medium">{job.salaryRange}</span>
                                                                    </>
                                                                ) : null}
                                                            </div>
                                                            
                                                            {/* Category Tags */}
                                                            <div className="flex flex-wrap gap-2 mb-4">
                                                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-full text-sm font-medium">
                                                                    {job.category}
                                                                </span>
                                                                {job.isRemote && (
                                                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-full text-sm font-medium">
                                                                        Remote
                                                                    </span>
                                                                )}
                                                                {job.hasEquity && (
                                                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-full text-sm font-medium">
                                                                        Equity
                                                                    </span>
                                                                )}
                                                                {job.hasVisa && (
                                                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-full text-sm font-medium">
                                                                        Visa Sponsorship
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Right side: Level badge, featured star (same row), and timestamp (below) */}
                                                        <div className="flex-shrink-0 flex flex-col items-end gap-2 sm:ml-4">
                                                            {/* Level badge and featured star in same row */}
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap">
                                                                    {job.level}
                                                                </span>
                                                                {job.isFeatured && (
                                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500">
                                                                        <span className="text-white text-xs font-bold">★</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Date posted below */}
                                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                {isNaN(diffDays) || diffDays < 0 ? '' : diffDays === 0 ? 'Today' : `${diffDays}d ago`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Expanded Summary */}
                                                    <div 
                                                        className={`mb-4 overflow-hidden transition-all duration-500 ease-in-out ${
                                                            expandedJobs.includes(job.id)
                                                                ? 'max-h-[1000px] opacity-100' 
                                                                : 'max-h-0 opacity-0'
                                                        }`}
                                                    >
                                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                                            <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">About the Role</h4>
                                                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                                                                {jobSummaries[job.id]?.role || job.roleSummary || 'Loading summary...'}
                                                            </p>
                                                            
                                                            {/* Company Fast Facts */}
                                                            {(() => {
                                                                const companyKey = job.company?.toLowerCase();
                                                                const facts = companyFastFacts[companyKey];
                                                                if (!facts) {
                                                                    return (
                                                                        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                                                            Loading company facts...
                                                                        </div>
                                                                    );
                                                                }
                                                                
                                                                return (
                                                                    <>
                                                                        <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-3">Company Fast Facts</h4>
                                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                                            {facts.headcount && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                                                                                        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                                        </svg>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Headcount</p>
                                                                                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{facts.headcount.toLocaleString()}</p>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {facts.fundingStage && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                                                                                        <svg className="w-5 h-5 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                        </svg>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Stage</p>
                                                                                        <p className="text-sm font-bold text-green-600 dark:text-green-400">{facts.fundingStage}</p>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {facts.hq && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                                                                                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                        </svg>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">HQ</p>
                                                                                        <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{facts.hq}</p>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {facts.workModel && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                                                                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                                                        </svg>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Work Model</p>
                                                                                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{facts.workModel}</p>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {facts.links.careers && (
                                                                                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                                                                                            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                                                            </svg>
                                                                                        </div>
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Careers</p>
                                                                                    </div>
                                                                                    <a href={facts.links.careers} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                                                                                        Visit →
                                                                                    </a>
                                                                                </div>
                                                                            )}
                                                                            {facts.links.partners && (
                                                                                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                                                                                            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                                            </svg>
                                                                                        </div>
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Partners</p>
                                                                                    </div>
                                                                                    <a href={facts.links.partners} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                                                                                        Visit →
                                                                                    </a>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Buttons */}
                                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2">
                                                        <button 
                                                            onClick={() => handleLearnMore(job)}
                                                            className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 sm:px-6 py-2.5 rounded-lg hover:bg-indigo-700 cursor-pointer font-medium text-sm transition-colors"
                                                        >
                                                            Learn More
                                                        </button>
                                                        <button 
                                                            onClick={() => trackJobClick(job.id, job.link, db)}
                                                            className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 sm:px-6 py-2.5 rounded-lg hover:bg-indigo-700 cursor-pointer font-medium text-sm transition-colors"
                                                        >
                                                            Apply Now
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {regularJobs.length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-4 dark:text-white">All Jobs</h2>
                                {regularJobs.map((job, index) => {
                                    const postedDate = job.postedDate ? new Date(job.postedDate) : new Date();
                                    const today = new Date();
                                    const diffDays = Math.floor((today - postedDate) / (1000 * 60 * 60 * 24));
                                    const isNew = diffDays <= 3;
                                    
                                    return (
                                        <div key={job.id || index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900 p-0 mb-4 overflow-hidden transition-colors duration-200">
                                            <div className="flex flex-col sm:flex-row">
                                                {/* Left: Logo Section */}
                                                <div className="flex-shrink-0 w-full sm:w-36 p-4 sm:p-6 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                                                    {job.companyLogo ? (
                                                        <img 
                                                            src={job.companyLogo}
                                                            alt={job.company}
                                                            className="w-28 h-16 object-contain mx-auto"
                                                            style={{ 
                                                                display: 'block', 
                                                                margin: '0 auto', 
                                                                objectPosition: 'center',
                                                                imageRendering: 'crisp-edges',
                                                                WebkitImageRendering: '-webkit-optimize-contrast'
                                                            }}
                                                            onError={(e) => {
                                                                // For admin accounts, try to reload the PC logo
                                                                const normalizedName = (job.company || '').toLowerCase().trim();
                                                                const isAdminAccount = normalizedName.includes('admin') && (
                                                                    normalizedName.includes('1255') || 
                                                                    normalizedName.includes('partnerships') || 
                                                                    normalizedName.includes('careers')
                                                                );
                                                                if (isAdminAccount && job.companyLogo !== '/logo-icon.svg') {
                                                                    e.target.src = '/logo-icon.svg';
                                                                    return;
                                                                }
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div 
                                                        className={`w-28 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center rounded ${job.companyLogo ? 'hidden' : ''}`}
                                                    >
                                                        <img 
                                                            src="/logo-icon.svg" 
                                                            alt="PC Logo" 
                                                            className="w-12 h-12 object-contain mx-auto"
                                                            style={{ 
                                                                display: 'block', 
                                                                margin: '0 auto',
                                                                imageRendering: 'crisp-edges',
                                                                WebkitImageRendering: '-webkit-optimize-contrast'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                {/* Divider */}
                                                <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
                                                
                                                {/* Right: Content Section */}
                                                <div className="flex-1 p-6">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex-1">
                                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2.5">{job.title}</h3>
                                                            
                                                            {/* Details Line */}
                                                            <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3 flex-wrap">
                                                                <span>{job.company}</span>
                                                                <span>·</span>
                                                                <span>{job.type || 'Full-Time'}</span>
                                                                {job.location ? (
                                                                    <>
                                                                        <span>·</span>
                                                                        <span>{job.location}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>·</span>
                                                                        <span>Unspecified</span>
                                                                    </>
                                                                )}
                                                                {job.salaryRange && job.salaryRange !== 'Competitive' && job.salaryRange !== 'Unspecified' ? (
                                                                    <>
                                                                        <span>·</span>
                                                                        <span className="text-green-600 font-medium">{job.salaryRange}</span>
                                                                    </>
                                                                ) : null}
                                                            </div>
                                                            
                                                            {/* Category Tags */}
                                                            <div className="flex flex-wrap gap-2 mb-4">
                                                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-full text-sm font-medium">
                                                                    {job.category}
                                                                </span>
                                                                {job.isRemote && (
                                                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-full text-sm font-medium">
                                                                        Remote
                                                                    </span>
                                                                )}
                                                                {job.hasEquity && (
                                                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-full text-sm font-medium">
                                                                        Equity
                                                                    </span>
                                                                )}
                                                                {job.hasVisa && (
                                                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-full text-sm font-medium">
                                                                        Visa Sponsorship
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Right side: Level badge, featured star (same row), and timestamp (below) */}
                                                        <div className="flex-shrink-0 flex flex-col items-end gap-2 sm:ml-4">
                                                            {/* Level badge and featured star in same row */}
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap">
                                                                    {job.level}
                                                                </span>
                                                                {job.isFeatured && (
                                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500">
                                                                        <span className="text-white text-xs font-bold">★</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Date posted below */}
                                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                {isNaN(diffDays) || diffDays < 0 ? '' : diffDays === 0 ? 'Today' : `${diffDays}d ago`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Expanded Summary */}
                                                    <div 
                                                        className={`mb-4 overflow-hidden transition-all duration-500 ease-in-out ${
                                                            expandedJobs.includes(job.id)
                                                                ? 'max-h-[1000px] opacity-100' 
                                                                : 'max-h-0 opacity-0'
                                                        }`}
                                                    >
                                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                                            <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">About the Role</h4>
                                                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                                                                {jobSummaries[job.id]?.role || job.roleSummary || 'Loading summary...'}
                                                            </p>
                                                            
                                                            {/* Company Fast Facts */}
                                                            {(() => {
                                                                const companyKey = job.company?.toLowerCase();
                                                                const facts = companyFastFacts[companyKey];
                                                                if (!facts) {
                                                                    return (
                                                                        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                                                            Loading company facts...
                                                                        </div>
                                                                    );
                                                                }
                                                                
                                                                return (
                                                                    <>
                                                                        <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-3">Company Fast Facts</h4>
                                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                                            {facts.headcount && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                                                                                        <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                                        </svg>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Headcount</p>
                                                                                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{facts.headcount.toLocaleString()}</p>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {facts.fundingStage && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                                                                                        <svg className="w-5 h-5 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                                        </svg>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Stage</p>
                                                                                        <p className="text-sm font-bold text-green-600 dark:text-green-400">{facts.fundingStage}</p>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {facts.hq && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                                                                                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                                        </svg>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">HQ</p>
                                                                                        <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{facts.hq}</p>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {facts.workModel && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                                                                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                                                        </svg>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Work Model</p>
                                                                                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{facts.workModel}</p>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            {facts.links.careers && (
                                                                                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                                                                                            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                                                            </svg>
                                                                                        </div>
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Careers</p>
                                                                                    </div>
                                                                                    <a href={facts.links.careers} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                                                                                        Visit →
                                                                                    </a>
                                                                                </div>
                                                                            )}
                                                                            {facts.links.partners && (
                                                                                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                                                                                            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                                            </svg>
                                                                                        </div>
                                                                                        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Partners</p>
                                                                                    </div>
                                                                                    <a href={facts.links.partners} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                                                                                        Visit →
                                                                                    </a>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Buttons */}
                                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-2">
                                                        <button 
                                                            onClick={() => handleLearnMore(job)}
                                                            className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 sm:px-6 py-2.5 rounded-lg hover:bg-indigo-700 cursor-pointer font-medium text-sm transition-colors"
                                                        >
                                                            Learn More
                                                        </button>
                                                        <button 
                                                            onClick={() => trackJobClick(job.id, job.link, db)}
                                                            className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 sm:px-6 py-2.5 rounded-lg hover:bg-indigo-700 cursor-pointer font-medium text-sm transition-colors"
                                                        >
                                                            Apply Now
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {jobs.length === 0 && !loading && (
                            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                                <p className="text-lg mb-2">🔍 No jobs available yet</p>
                                <p className="text-sm">Check back soon for new opportunities!</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default App;

