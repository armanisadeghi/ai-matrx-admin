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
  getBaseUrl: () => string;
  isCheckingLocalhost: boolean;
  hasToken: boolean;
}

interface UseApiTestConfigOptions {
  defaultServerType?: ServerType;
  defaultAuthToken?: string;
  localUrl?: string;
  productionUrl?: string;
  autoCheckLocalhost?: boolean;
  requireToken?: boolean;
}

/**
 * Hook for managing API test configuration (server type and auth token)
 * 
 * Auth tokens are stored in cookies for persistence across sessions and pages.
 * 
 * @example
 * ```tsx
 * const apiConfig = useApiTestConfig({
 *   defaultServerType: 'local',
 *   autoCheckLocalhost: true, // Automatically fallback to production if localhost unavailable
 *   requireToken: true, // Show token input if not stored
 * });
 * 
 * // Use in fetch calls
 * fetch(`${apiConfig.baseUrl}/api/endpoint`, {
 *   headers: { Authorization: `Bearer ${apiConfig.authToken}` }
 * });
 * ```
 */
export function useApiTestConfig(options: UseApiTestConfigOptions = {}): UseApiTestConfigReturn {
  const {
    defaultServerType = 'production',
    defaultAuthToken = '',
    localUrl = process.env.NEXT_PUBLIC_LOCAL_SOCKET_URL || 'http://localhost:8000',
    productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_SOCKET_URL || 'https://server.app.matrxserver.com',
    autoCheckLocalhost = false,
    requireToken = true,
  } = options;

  // Initialize auth token from cookie or default
  const [authToken, setAuthTokenState] = useState<string>(() => {
    const stored = getStoredAdminToken();
    return stored || defaultAuthToken;
  });
  
  const [serverType, setServerType] = useState<ServerType>(defaultServerType);
  const [isCheckingLocalhost, setIsCheckingLocalhost] = useState(false);
  const hasCheckedRef = useRef(false);
  const manualSwitchRef = useRef(false);
  
  // Wrapped setAuthToken that also stores in cookie
  const setAuthToken = (token: string) => {
    setAuthTokenState(token);
    if (token) {
      setStoredAdminToken(token);
    }
  };

  const getBaseUrl = (): string => {
    return serverType === 'local' ? localUrl : productionUrl;
  };

  // Check if localhost is available
  const checkLocalhostAvailability = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

      const response = await fetch(`${localUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Auto-check localhost availability on mount (if enabled and defaultServerType is 'local')
  useEffect(() => {
    if (!autoCheckLocalhost || hasCheckedRef.current || defaultServerType !== 'local') {
      return;
    }

    const checkAndFallback = async () => {
      hasCheckedRef.current = true;
      setIsCheckingLocalhost(true);

      // Wait a bit for the page to fully load before checking
      await new Promise(resolve => setTimeout(resolve, 500));

      const isAvailable = await checkLocalhostAvailability();

      if (!isAvailable) {
        // Localhost not available, switch to production
        setServerType('production');
        toast.info('Localhost unavailable', {
          description: 'Automatically switched to production server',
        });
      }

      setIsCheckingLocalhost(false);
    };

    checkAndFallback();
  }, [autoCheckLocalhost, defaultServerType, localUrl]);

  // Wrapped setServerType that handles manual clicks
  const handleSetServerType = async (type: ServerType) => {
    manualSwitchRef.current = true;

    // If manually switching to localhost, check availability first
    if (type === 'local') {
      setIsCheckingLocalhost(true);
      const isAvailable = await checkLocalhostAvailability();
      setIsCheckingLocalhost(false);

      if (!isAvailable) {
        // Localhost not available, stay on production
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
    getBaseUrl,
    isCheckingLocalhost,
    hasToken: authToken.length > 0,
  };
}

