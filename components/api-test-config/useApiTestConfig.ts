import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getStoredAdminToken, setStoredAdminToken } from '@/utils/api-test-auth';

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
 * **Authority model:** This hook is the single source of truth for server
 * selection. Pages provide a `defaultServerType` for instant render, but
 * the hook validates localhost on mount and overrides if unavailable.
 * Pages must NEVER perform their own health checks or override the config.
 *
 * Auth tokens are stored in cookies for persistence across sessions and pages.
 */
export function useApiTestConfig(options: UseApiTestConfigOptions = {}): UseApiTestConfigReturn {
  const {
    defaultServerType = 'production',
    defaultAuthToken = '',
    localUrl = process.env.NEXT_PUBLIC_LOCAL_SOCKET_URL || 'http://localhost:8000',
    productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_SOCKET_URL || 'https://server.app.matrxserver.com',
    requireToken = true,
  } = options;

  // Initialize with empty to avoid hydration mismatch (cookies only exist on client).
  // Stored token is loaded in useEffect after mount.
  const [authToken, setAuthTokenState] = useState<string>(defaultAuthToken);

  const [serverType, setServerType] = useState<ServerType>(defaultServerType);
  const [isCheckingLocalhost, setIsCheckingLocalhost] = useState(defaultServerType === 'local');
  const [isLocalhostAvailable, setIsLocalhostAvailable] = useState(false);
  const hasCheckedRef = useRef(false);

  const setAuthToken = (token: string) => {
    setAuthTokenState(token);
    if (token) {
      setStoredAdminToken(token);
    }
  };

  const getBaseUrl = (): string => {
    return serverType === 'local' ? localUrl : productionUrl;
  };

  // Ping localhost to determine availability (any HTTP response = available)
  const checkLocalhostAvailability = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      await fetch(`${localUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  };

  // Load stored token from cookies after mount (avoids hydration mismatch)
  useEffect(() => {
    const stored = getStoredAdminToken();
    if (stored) {
      setAuthTokenState(stored);
    }
  }, []);

  // Always check localhost on mount — this is the single validation point
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const validate = async () => {
      setIsCheckingLocalhost(true);
      const available = await checkLocalhostAvailability();
      setIsLocalhostAvailable(available);

      if (!available && serverType === 'local') {
        setServerType('production');
        toast.info('Localhost unavailable', {
          description: 'Automatically switched to production server',
        });
      }

      setIsCheckingLocalhost(false);
    };

    validate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Manual server type change — validated before committing
  const handleSetServerType = async (type: ServerType) => {
    if (type === 'local') {
      setIsCheckingLocalhost(true);
      const available = await checkLocalhostAvailability();
      setIsLocalhostAvailable(available);
      setIsCheckingLocalhost(false);

      if (!available) {
        toast.error('Localhost unavailable', {
          description: 'Cannot connect to localhost server. Please start the server and try again.',
        });
        return;
      }
    }

    setServerType(type);
  };

  return {
    serverType,
    authToken,
    baseUrl: getBaseUrl(),
    setServerType: handleSetServerType,
    setAuthToken,
    isCheckingLocalhost,
    isLocalhostAvailable,
    hasToken: authToken.length > 0,
  };
}
