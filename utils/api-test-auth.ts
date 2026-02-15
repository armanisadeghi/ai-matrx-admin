/**
 * Centralized API Test Authentication Token Management
 * 
 * Stores admin auth tokens in cookies for secure, persistent access across all API test pages.
 * Works across localhost, production, and all subdomains.
 */

const COOKIE_NAME = 'api_test_admin_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Get the stored admin token from cookies
 */
export function getStoredAdminToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Store the admin token in a cookie
 * Sets cookie at the highest domain level possible for maximum compatibility
 */
export function setStoredAdminToken(token: string): void {
  if (typeof document === 'undefined') return;
  
  // Get the domain for the cookie
  const hostname = window.location.hostname;
  
  // For localhost, don't set domain (browser handles it)
  // For production domains, set to root domain (e.g., .matrxserver.com)
  let domain = '';
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // Extract root domain (e.g., "app.matrxserver.com" -> ".matrxserver.com")
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      domain = `.${parts.slice(-2).join('.')}`;
    }
  }
  
  // Build cookie string
  let cookieString = `${COOKIE_NAME}=${encodeURIComponent(token)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  
  // Add domain if not localhost
  if (domain) {
    cookieString += `; domain=${domain}`;
  }
  
  // Set secure flag for HTTPS
  if (window.location.protocol === 'https:') {
    cookieString += '; Secure';
  }
  
  document.cookie = cookieString;
}

/**
 * Clear the stored admin token
 */
export function clearStoredAdminToken(): void {
  if (typeof document === 'undefined') return;
  
  const hostname = window.location.hostname;
  let domain = '';
  
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      domain = `.${parts.slice(-2).join('.')}`;
    }
  }
  
  // Set expiry to past date to delete
  let cookieString = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  
  if (domain) {
    cookieString += `; domain=${domain}`;
  }
  
  document.cookie = cookieString;
}

/**
 * Check if a token is stored
 */
export function hasStoredAdminToken(): boolean {
  return getStoredAdminToken() !== null;
}
