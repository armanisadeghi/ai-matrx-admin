# API Test Config Component

Reusable configuration management for API test pages. Provides separated management of server selection (local vs. production) and authentication tokens.

## Features

- **Separate State Management**: Server type and auth token are independently managed
- **Easy Integration**: Single hook + single component for all test pages
- **Type-Safe**: Full TypeScript support with exported types
- **Flexible**: Optional auth token display, customizable labels, compact mode
- **Environment-Aware**: Automatically uses environment variables for URLs

## Usage

### Basic Example

```tsx
import { useApiTestConfig, ApiTestConfigPanel } from '@/components/api-test-config';

export default function MyTestPage() {
  const apiConfig = useApiTestConfig({
    defaultServerType: 'production',
    defaultAuthToken: TEST_ADMIN_TOKEN,
  });

  return (
    <div>
      {/* Configuration Panel */}
      <ApiTestConfigPanel config={apiConfig} />
      
      {/* Use in API calls */}
      <Button onClick={() => {
        fetch(`${apiConfig.baseUrl}/api/endpoint`, {
          headers: { 
            Authorization: `Bearer ${apiConfig.authToken}` 
          }
        });
      }}>
        Test API
      </Button>
    </div>
  );
}
```

### Hook API

```tsx
const apiConfig = useApiTestConfig({
  defaultServerType?: 'local' | 'production',  // Default: 'production'
  defaultAuthToken?: string,                   // Default: ''
  localUrl?: string,                           // Default: from env
  productionUrl?: string,                      // Default: from env
});

// Returns:
apiConfig.serverType      // Current server type
apiConfig.authToken       // Current auth token
apiConfig.baseUrl         // Computed base URL
apiConfig.setServerType() // Update server type
apiConfig.setAuthToken()  // Update auth token
apiConfig.getBaseUrl()    // Get base URL (same as baseUrl)
```

### Component Props

```tsx
<ApiTestConfigPanel
  config={apiConfig}              // Required: hook return value
  className=""                    // Optional: additional CSS classes
  showAuthToken={true}            // Optional: show auth token input
  authTokenLabel="Auth Token:"    // Optional: custom label
  serverLabel="Server:"           // Optional: custom label
  compact={false}                 // Optional: compact mode (URL below)
/>
```

## Examples

### Without Auth Token

```tsx
const apiConfig = useApiTestConfig();

<ApiTestConfigPanel 
  config={apiConfig} 
  showAuthToken={false} 
/>
```

### Compact Mode

```tsx
<ApiTestConfigPanel 
  config={apiConfig} 
  compact={true}
/>
```

### Custom Labels

```tsx
<ApiTestConfigPanel 
  config={apiConfig}
  serverLabel="Environment:"
  authTokenLabel="API Key:"
/>
```

## Migration

### Before

```tsx
const [serverType, setServerType] = useState<ServerType>('production');
const [authToken, setAuthToken] = useState<string>(TEST_ADMIN_TOKEN);

const getBaseUrl = () => {
  if (serverType === 'local') {
    return process.env.NEXT_PUBLIC_LOCAL_SOCKET_URL || 'http://localhost:8000';
  }
  return process.env.NEXT_PUBLIC_PRODUCTION_SOCKET_URL || 'https://server.app.matrxserver.com';
};

// Manual UI for server selection and auth token
```

### After

```tsx
const apiConfig = useApiTestConfig({
  defaultServerType: 'production',
  defaultAuthToken: TEST_ADMIN_TOKEN,
});

<ApiTestConfigPanel config={apiConfig} />

// Use apiConfig.baseUrl and apiConfig.authToken
```

## Files

- `useApiTestConfig.ts` - Hook for state management
- `ApiTestConfigPanel.tsx` - UI component
- `index.ts` - Barrel exports

