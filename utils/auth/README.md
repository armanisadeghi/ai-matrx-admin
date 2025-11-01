# Token Refresh System

## Overview

The Token Refresh System automatically refreshes Supabase authentication tokens before they expire, ensuring users remain authenticated without interruption.

## How It Works

### 1. **Token Expiry Tracking**
- Supabase access tokens have an expiry time (typically 1 hour, configurable in Supabase settings)
- The system tracks the `expires_at` timestamp from the session
- Token expiry info is stored in both:
  - **Redux** (`userSlice.tokenExpiresAt`)
  - **localStorage** (`supabase_token_expiry`)

### 2. **Proactive Refresh**
- The `TokenRefreshManager` runs a background check every **5 minutes**
- If the token will expire within **3 days** (configurable), it automatically refreshes
- Refresh happens silently without disrupting the user experience
- The new token and expiry are updated in both Redux and localStorage

### 3. **Seamless User Experience**
- Users stay logged in as long as they use the app at least once within the refresh threshold
- No redirect to login page
- No UI interruption
- Works entirely in the background

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Authenticated                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              TokenRefreshInitializer (Client)                │
│  - Mounted in app/(authenticated)/layout.tsx                 │
│  - Starts monitoring when user is authenticated              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           TokenRefreshManager (Singleton)                    │
│  - Checks session every 5 minutes                            │
│  - Compares expires_at with current time                     │
│  - Refreshes if within threshold (3 days)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Client                             │
│  - Calls auth.refreshSession()                               │
│  - Returns new access_token and expires_at                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Update Token Storage                            │
│  1. Redux Store (setAccessToken, setTokenExpiry)             │
│  2. localStorage (supabase_token_expiry)                     │
│  3. Supabase cookies (handled by @supabase/ssr)              │
└─────────────────────────────────────────────────────────────┘
```

## Files

### Core Files
- **`utils/auth/TokenRefreshManager.ts`** - Main token refresh logic
- **`components/auth/TokenRefreshInitializer.tsx`** - Client component that starts monitoring
- **`lib/redux/slices/userSlice.ts`** - Redux state for user and token data

### Configuration
- **Refresh Threshold**: `TOKEN_REFRESH_THRESHOLD_MS` (default: 3 days)
- **Check Interval**: `CHECK_INTERVAL_MS` (default: 5 minutes)
- **Storage Key**: `supabase_token_expiry`

## Usage

### Automatic Usage
The system is **already integrated** and works automatically:
1. User logs in
2. `TokenRefreshInitializer` starts monitoring
3. Tokens are refreshed automatically before expiry

### Manual Usage (Debugging)

```typescript
import { tokenRefreshManager } from '@/utils/auth/TokenRefreshManager';

// Check token status
const status = await tokenRefreshManager.getTokenStatus();
console.log(status);
// {
//   isActive: true,
//   expiresAt: Date,
//   expiresIn: "6 days 12h",
//   needsRefresh: false
// }

// Force refresh (for testing)
await tokenRefreshManager.forceRefresh();

// Get stored token info
const info = tokenRefreshManager.getStoredTokenInfo();
console.log(info);
// {
//   expiresAt: 1234567890,
//   lastChecked: 1234567890000
// }
```

### Redux Selectors

```typescript
import { useAppSelector } from '@/lib/redux/hooks';

function MyComponent() {
  const accessToken = useAppSelector(state => state.user.accessToken);
  const tokenExpiresAt = useAppSelector(state => state.user.tokenExpiresAt);
  
  // Calculate time until expiry
  const timeUntilExpiry = tokenExpiresAt 
    ? (tokenExpiresAt * 1000) - Date.now() 
    : null;
}
```

## Configuration

To change the refresh threshold or check interval, edit `TokenRefreshManager.ts`:

```typescript
// Refresh when token has 3 days or less until expiry
const TOKEN_REFRESH_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// Check every 5 minutes
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
```

## Important Notes

### Default Token Expiry
- **Supabase access tokens** expire in **1 hour** by default (not 7 days)
- This can be changed in Supabase Dashboard → Authentication → Settings → JWT expiry
- Longer expiry times reduce refresh frequency but may have security implications

### Refresh Tokens
- The system uses Supabase **refresh tokens** to get new access tokens
- Refresh tokens are long-lived and stored securely in HTTP-only cookies
- Refresh tokens are managed by `@supabase/ssr`

### Server-Side vs Client-Side
- Token refresh runs **client-side only** (browser environment)
- Server-side middleware already handles automatic token refresh on requests
- This system adds proactive client-side refresh for better UX

## Troubleshooting

### Token Not Refreshing
1. Check browser console for `[TokenRefreshManager]` logs
2. Verify user is authenticated: `tokenRefreshManager.getTokenStatus()`
3. Check if `TokenRefreshInitializer` is mounted in layout
4. Verify Supabase credentials are correct

### Refresh Fails
- **Invalid refresh token**: User needs to re-authenticate
- **Network error**: Check network connectivity
- **Supabase down**: Check Supabase status

### Logging
All token refresh activity is logged to console with `[TokenRefreshManager]` prefix:
- Session checks
- Refresh triggers
- Success/failure messages
- Time until expiry

## Security Considerations

1. **Access tokens** are stored in Redux (memory) and automatically cleared on logout
2. **Refresh tokens** are stored in HTTP-only cookies (not accessible to JavaScript)
3. Token expiry times are stored in localStorage (not sensitive)
4. Always use HTTPS in production to protect tokens in transit
5. Follow Supabase security best practices for token expiry settings

## Testing

To test the token refresh system:

```typescript
// 1. Check current status
const status = await tokenRefreshManager.getTokenStatus();
console.log('Current status:', status);

// 2. Force a refresh
await tokenRefreshManager.forceRefresh();

// 3. Verify new token was stored
const newStatus = await tokenRefreshManager.getTokenStatus();
console.log('After refresh:', newStatus);
```

## Future Enhancements

Potential improvements:
- [ ] Configurable threshold per user/role
- [ ] Token refresh notifications
- [ ] Analytics/monitoring integration
- [ ] Automatic retry with exponential backoff
- [ ] Token refresh event emitter for custom hooks

