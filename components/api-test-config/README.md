# API Test Configuration System

Centralized authentication and server management for all API test pages with secure cookie-based token storage.

## Overview

This system provides a consistent way to manage API test configurations across all test pages, with automatic localhost availability detection and secure cookie-based authentication token storage.

## Features

### 🔐 Cookie-Based Authentication
- Admin tokens stored in secure, persistent cookies
- Works across all API test pages automatically
- Domain-level storage (works on subdomains)
- 1-year expiration
- Secure flag on HTTPS
- Works on both localhost and production

### 🌐 Smart Server Selection
- Automatic localhost availability detection
- Seamless fallback to production when localhost unavailable
- Manual re-check on user click
- Visual feedback during checks

### 🎯 Centralized Management
- Single setup page for token configuration
- Token automatically available on all test pages
- Easy clear/edit functionality
- Visual status indicators

## Usage

### Quick Start

```tsx
import { useApiTestConfig, ApiTestConfigPanel } from '@/components/api-test-config';

export default function MyTestPage() {
  const apiConfig = useApiTestConfig({
    defaultServerType: 'local',
    autoCheckLocalhost: true,
    requireToken: true,
  });

  return (
    <div>
      <ApiTestConfigPanel config={apiConfig} />
      
      {/* Use the config in your API calls */}
      <button onClick={async () => {
        const response = await fetch(`${apiConfig.baseUrl}/api/endpoint`, {
          headers: {
            'Authorization': `Bearer ${apiConfig.authToken}`
          }
        });
      }}>
        Test API
      </button>
    </div>
  );
}
```

### Hook Options

```typescript
interface UseApiTestConfigOptions {
  defaultServerType?: 'local' | 'production';  // Default: 'production'
  defaultAuthToken?: string;                    // Fallback if no cookie
  localUrl?: string;                            // Default: process.env.NEXT_PUBLIC_LOCAL_SOCKET_URL
  productionUrl?: string;                       // Default: process.env.NEXT_PUBLIC_PRODUCTION_SOCKET_URL
  autoCheckLocalhost?: boolean;                 // Default: false
  requireToken?: boolean;                       // Default: true
}
```

### Hook Return Values

```typescript
interface UseApiTestConfigReturn {
  serverType: 'local' | 'production';
  authToken: string;
  baseUrl: string;
  setServerType: (type: ServerType) => void;
  setAuthToken: (token: string) => void;
  getBaseUrl: () => string;
  isCheckingLocalhost: boolean;
  hasToken: boolean;
}
```

## Token Management

### Setup Page

Visit `/demos/api-tests/setup` to configure your admin token:
- Enter your admin authentication token
- Token is automatically saved to cookies
- Works across all API test pages
- Persists for 1 year

### Programmatic Access

```typescript
import { 
  getStoredAdminToken, 
  setStoredAdminToken, 
  clearStoredAdminToken,
  hasStoredAdminToken 
} from '@/utils/api-test-auth';

// Get current token
const token = getStoredAdminToken();

// Save a token
setStoredAdminToken('your-token-here');

// Check if token exists
if (hasStoredAdminToken()) {
  // Token is configured
}

// Clear token
clearStoredAdminToken();
```

## Component Props

### ApiTestConfigPanel

```typescript
interface ApiTestConfigPanelProps {
  config: UseApiTestConfigReturn;
  className?: string;
  showAuthToken?: boolean;      // Default: true
  authTokenLabel?: string;       // Default: 'Auth Token:'
  serverLabel?: string;          // Default: 'Server:'
  compact?: boolean;             // Default: false
}
```

## Automatic Localhost Detection

When `autoCheckLocalhost: true`:

1. **On Page Load** (500ms delay):
   - Pings `localhost:8000/health` with 2-second timeout
   - If available → stays on localhost
   - If unavailable → switches to production with info toast
   - Only checks once per page load

2. **Manual Switch to Localhost**:
   - Checks availability before switching
   - Shows loading spinner during check
   - If unavailable → shows error toast and stays on production
   - If available → switches to localhost

3. **Manual Switch to Production**:
   - Switches immediately (no check needed)

## Cookie Details

### Storage Configuration

```typescript
Cookie Name: 'api_test_admin_token'
Max Age: 31,536,000 seconds (1 year)
Path: '/'
SameSite: 'Lax'
Secure: true (on HTTPS)
Domain: Root domain level (e.g., .matrxserver.com)
```

### Domain Handling

- **Localhost**: No domain attribute (browser handles it)
- **Production**: Set to root domain for subdomain compatibility
  - `app.matrxserver.com` → `.matrxserver.com`
  - Works on `app.matrxserver.com`, `api.matrxserver.com`, etc.

## Security Considerations

1. **Token Storage**: Stored in browser cookies, not in code
2. **Secure Flag**: Enabled on HTTPS connections
3. **SameSite**: Set to 'Lax' to prevent CSRF
4. **No Transmission**: Token stays in browser, not sent to third parties
5. **Admin Only**: This system is for admin testing only

## Migration Guide

### Before (Hardcoded Token)

```tsx
import { TEST_ADMIN_TOKEN } from './sample-prompt';

const apiConfig = useApiTestConfig({
  defaultAuthToken: TEST_ADMIN_TOKEN,
});
```

### After (Cookie-Based)

```tsx
const apiConfig = useApiTestConfig({
  requireToken: true,
  autoCheckLocalhost: true,
});
```

**Steps:**
1. Remove `TEST_ADMIN_TOKEN` imports
2. Remove `defaultAuthToken` from config
3. Add `requireToken: true` and `autoCheckLocalhost: true`
4. Visit `/demos/api-tests/setup` to configure token once
5. Token automatically available on all pages

## Available Test Pages

All these pages now use cookie-based authentication:

- `/demos/api-tests/setup` - Token configuration
- `/demos/api-tests` - Main API tests
- `/demos/api-tests/unified-chat` - Unified chat API
- `/demos/api-tests/chat` - Chat API
- `/demos/api-tests/agent` - Agent API
- `/demos/api-tests/pdf-extract` - PDF extraction
- `/demos/api-tests/health` - Health checks

## Files

```
components/api-test-config/
├── index.ts                    # Barrel exports
├── useApiTestConfig.ts         # Hook with cookie integration
├── ApiTestConfigPanel.tsx      # UI component
└── README.md                   # This file

utils/
└── api-test-auth.ts           # Cookie management utilities

app/(public)/demos/api-tests/
└── setup/
    └── page.tsx               # Token setup page
```

## Best Practices

1. **One-Time Setup**: Configure token once at `/demos/api-tests/setup`
2. **Auto-Check**: Enable `autoCheckLocalhost: true` for better UX
3. **Require Token**: Use `requireToken: true` to show token UI
4. **Don't Hardcode**: Never commit tokens to code
5. **Team Sharing**: Share token securely with team members (not in code)

## Troubleshooting

### Token Not Persisting
- Check browser cookie settings
- Ensure cookies are enabled
- Check domain/path settings in DevTools

### Localhost Not Detected
- Ensure backend is running on `localhost:8000`
- Check `/health` endpoint is available
- Verify no CORS issues

### Token Not Working
- Verify token is valid admin token
- Check Authorization header format
- Ensure token hasn't expired on backend

## Future Enhancements

- [ ] Token expiration warnings
- [ ] Multiple token profiles
- [ ] Token validation on save
- [ ] Backend health check caching
- [ ] Token refresh mechanism
