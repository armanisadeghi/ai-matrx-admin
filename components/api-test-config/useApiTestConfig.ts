import { useState } from 'react';

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
}

interface UseApiTestConfigOptions {
  defaultServerType?: ServerType;
  defaultAuthToken?: string;
  localUrl?: string;
  productionUrl?: string;
}

/**
 * Hook for managing API test configuration (server type and auth token)
 * 
 * @example
 * ```tsx
 * const apiConfig = useApiTestConfig({
 *   defaultServerType: 'production',
 *   defaultAuthToken: TEST_ADMIN_TOKEN,
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
  } = options;

  const [serverType, setServerType] = useState<ServerType>(defaultServerType);
  const [authToken, setAuthToken] = useState<string>(defaultAuthToken);

  const getBaseUrl = (): string => {
    return serverType === 'local' ? localUrl : productionUrl;
  };

  return {
    serverType,
    authToken,
    baseUrl: getBaseUrl(),
    setServerType,
    setAuthToken,
    getBaseUrl,
  };
}

