// Auth0 Configuration
// Note: You need to set VITE_AUTH0_CLIENT_ID in your .env file (Vite uses VITE_ prefix)
// Get your Client ID from: https://manage.auth0.com/ → Applications → Your App

const getClientId = () => {
    // Vite uses import.meta.env for environment variables
    if (import.meta.env?.VITE_AUTH0_CLIENT_ID) {
        return import.meta.env.VITE_AUTH0_CLIENT_ID;
    }
    // Fallback - you should set this in .env file
    return '';
};

// Get current origin dynamically (handles different ports)
const getRedirectUri = () => {
    // Use current origin to handle any port (3000, 3001, 5173, etc.)
    return window.location.origin;
};

export const auth0Config = {
    domain: 'dev-xsw8nz51gqudjoik.us.auth0.com',
    clientId: getClientId(),
    authorizationParams: {
        redirect_uri: getRedirectUri(),
        audience: 'https://dev-xsw8nz51gqudjoik.us.auth0.com/api/v2/',
        scope: 'openid profile email',
        response_type: 'code',
        response_mode: 'query'
        // Note: Do NOT include 'organization' parameter unless your Auth0 app specifically requires it
        // If you see "parameter organization is required" error, disable organization requirement in Auth0 dashboard
    },
    // Use redirect instead of popup for better compatibility
    useRefreshTokens: true,
    cacheLocation: 'localstorage'
};

// Log configuration for debugging
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
console.log('🔧 Auth0 Config:', {
    domain: auth0Config.domain,
    clientId: auth0Config.clientId ? `${auth0Config.clientId.substring(0, 10)}...` : 'MISSING',
    redirect_uri: auth0Config.authorizationParams.redirect_uri,
    hasClientId: !!auth0Config.clientId
});

// Important: Verify Auth0 Dashboard Settings
if (typeof window !== 'undefined') {
    console.log('📋 IMPORTANT: Verify these settings in your Auth0 Dashboard:');
    console.log('   1. Application Type: Single Page Application');
    console.log('   2. Allowed Callback URLs must include:', currentOrigin);
    console.log('   3. Allowed Logout URLs must include:', currentOrigin);
    console.log('   4. Allowed Web Origins must include:', currentOrigin);
    console.log('   5. Connections enabled: Username-Password-Authentication, google-oauth2, windowslive');
    console.log('   6. ⚠️ DISABLE Organization Requirement:');
    console.log('      - Go to Applications → Your App → Settings');
    console.log('      - Scroll to "Organization Usage" section');
    console.log('      - Set "Require Organization" to OFF (or remove organization requirement)');
    console.log('   Dashboard URL: https://manage.auth0.com/');
}

// Warn if client ID is missing
if (!auth0Config.clientId) {
    console.warn('⚠️ Auth0 Client ID is missing! Please set VITE_AUTH0_CLIENT_ID in your .env file.');
    console.warn('Get your Client ID from: https://manage.auth0.com/ → Applications → Your App');
}

