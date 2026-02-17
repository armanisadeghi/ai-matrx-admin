import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { getStoredAdminToken, setStoredAdminToken } from '@/utils/api-test-auth';
import { useAdminOverride } from '@/hooks/useAdminOverride';
import type { ContextScope } from '@/lib/api/types';

export type ServerType = 'local' | 'production';

export interface ApiTestConfig {
  serverType: ServerType;
  authToken: string;
  baseUrl: string;
}

export interface UseApiTestConfigReturn extends ApiTestConfig {
  setServerType: (type: ServerType) => void;
  setAuthToken: (token: string) => void;
  isCheckingLocalhost: boolean;
  isLocalhostAvailable: boolean;
  hasToken: boolean;
  /** Admin scope overrides for testing */
  scopeOverride: ContextScope;
  setScopeOverride: (scope: ContextScope) => void;
}

interface UseApiTestConfigOptions {
  defaultServerType?: ServerType;
  defaultAuthToken?: string;
  localUrl?: string;
  productionUrl?: string;
  requireToken?: boolean;
}

/**
 * Hook for managing API test configuration (server type and auth token).
 *
 * Now unified with the global admin override system:
 * - Server selection reads/writes from Redux adminPreferences (synced with AdminMenu)
 * - Localhost health check uses the shared useAdminOverride hook
 * - Auth tokens stored in cookies for persistence across sessions
 * - Adds scope override support for admin testing with org/project/task context
 */
export function useApiTestConfig(options: UseApiTestConfigOptions = {}): UseApiTestConfigReturn {
  const {
    defaultAuthToken = '',
    requireToken = true,
  } = options;

  // Use the unified admin override for server selection
  const {
    backendUrl,
    isLocalhost,
    isChecking: isCheckingLocalhost,
    setServer,
    serverOverride,
  } = useAdminOverride();

  // Initialize with empty to avoid hydration mismatch (cookies only exist on client).
  const [authToken, setAuthTokenState] = useState<string>(defaultAuthToken);

  // Scope override for admin testing
  const [scopeOverride, setScopeOverride] = useState<ContextScope>({});

  const setAuthToken = (token: string) => {
    setAuthTokenState(token);
    if (token) {
      setStoredAdminToken(token);
    }
  };

  // Load stored token from cookies after mount (avoids hydration mismatch)
  useEffect(() => {
    const stored = getStoredAdminToken();
    if (stored) {
      setAuthTokenState(stored);
    }
  }, []);

  // Server type derived from unified admin override
  const serverType: ServerType = isLocalhost ? 'local' : 'production';

  // Localhost available if we're currently on localhost or override says so
  const isLocalhostAvailable = isLocalhost || serverOverride === 'localhost';

  // Server type change delegates to the unified hook
  const handleSetServerType = useCallback(async (type: ServerType) => {
    if (type === 'local') {
      const success = await setServer('localhost');
      if (!success) {
        toast.error('Localhost unavailable', {
          description: 'Cannot connect to localhost server. Please start the server and try again.',
        });
        return;
      }
    } else {
      await setServer(null);
    }
  }, [setServer]);

  return {
    serverType,
    authToken,
    baseUrl: backendUrl,
    setServerType: handleSetServerType,
    setAuthToken,
    isCheckingLocalhost,
    isLocalhostAvailable,
    hasToken: authToken.length > 0,
    scopeOverride,
    setScopeOverride,
  };
}
