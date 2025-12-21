'use client';

import { Button } from '@/components/ui/button';
import { BasicInput } from '@/components/ui/input';
import type { ServerType, UseApiTestConfigReturn } from './useApiTestConfig';

interface ApiTestConfigPanelProps {
  config: UseApiTestConfigReturn;
  className?: string;
  showAuthToken?: boolean;
  authTokenLabel?: string;
  serverLabel?: string;
  compact?: boolean;
}

/**
 * Reusable configuration panel for API test pages
 * Displays server selection and optional auth token input
 * 
 * @example
 * ```tsx
 * const apiConfig = useApiTestConfig();
 * 
 * return (
 *   <div>
 *     <ApiTestConfigPanel config={apiConfig} />
 *     {/* Your test UI *\/}
 *   </div>
 * );
 * ```
 */
export function ApiTestConfigPanel({
  config,
  className = '',
  showAuthToken = true,
  authTokenLabel = 'Auth Token:',
  serverLabel = 'Server:',
  compact = false,
}: ApiTestConfigPanelProps) {
  return (
    <div className={className}>
      {/* Server Selection & Auth Token - wraps automatically */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-1.5 border-b">
        {/* Server Selection */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold w-24">{serverLabel}</span>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={config.serverType === 'local' ? 'default' : 'outline'}
              onClick={() => config.setServerType('local')}
              className="h-7 text-xs px-2"
            >
              Localhost
            </Button>
            <Button
              size="sm"
              variant={config.serverType === 'production' ? 'default' : 'outline'}
              onClick={() => config.setServerType('production')}
              className="h-7 text-xs px-2"
            >
              Production
            </Button>
          </div>
        </div>

        {/* Auth Token */}
        {showAuthToken && (
          <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-[400px]">
            <span className="text-xs font-semibold whitespace-nowrap">{authTokenLabel}</span>
            <BasicInput
              type="text"
              value={config.authToken}
              onChange={(e) => config.setAuthToken(e.target.value)}
              placeholder="Enter auth token"
              className="h-7 text-xs flex-1 font-mono"
            />
          </div>
        )}

        {/* URL display */}
        {!compact && (
          <span className="text-xs text-muted-foreground font-mono ml-auto">
            {config.baseUrl}
          </span>
        )}
      </div>
      
      {/* URL display for compact mode */}
      {compact && (
        <div className="text-xs text-muted-foreground font-mono px-1 pt-1">
          {config.baseUrl}
        </div>
      )}
    </div>
  );
}

