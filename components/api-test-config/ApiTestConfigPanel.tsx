'use client';

import { Button } from '@/components/ui/button';
import { BasicInput } from '@/components/ui/input';
import { Loader2, Key, Check, X } from 'lucide-react';
import { useState } from 'react';
import { clearStoredAdminToken } from '@/utils/api-test-auth';
import { toast } from 'sonner';
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
 * Displays server selection and auth token management
 * 
 * Tokens are stored in cookies for persistence across all API test pages
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
  const [isEditingToken, setIsEditingToken] = useState(!config.hasToken);
  const [tempToken, setTempToken] = useState(config.authToken);

  const handleSaveToken = () => {
    if (tempToken.trim()) {
      config.setAuthToken(tempToken.trim());
      setIsEditingToken(false);
      toast.success('Token saved', {
        description: 'Auth token stored in cookies for all API test pages',
      });
    }
  };

  const handleClearToken = () => {
    clearStoredAdminToken();
    config.setAuthToken('');
    setTempToken('');
    setIsEditingToken(true);
    toast.info('Token cleared', {
      description: 'Auth token removed from cookies',
    });
  };

  const handleCancelEdit = () => {
    setTempToken(config.authToken);
    setIsEditingToken(false);
  };

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
              disabled={config.isCheckingLocalhost}
              className="h-7 text-xs px-2"
            >
              {config.isCheckingLocalhost && config.serverType !== 'local' && (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              )}
              Localhost
            </Button>
            <Button
              size="sm"
              variant={config.serverType === 'production' ? 'default' : 'outline'}
              onClick={() => config.setServerType('production')}
              disabled={config.isCheckingLocalhost}
              className="h-7 text-xs px-2"
            >
              Production
            </Button>
          </div>
          {config.isCheckingLocalhost && (
            <span className="text-xs text-muted-foreground">Checking availability...</span>
          )}
        </div>

        {/* Auth Token */}
        {showAuthToken && (
          <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-[500px]">
            {!isEditingToken && config.hasToken ? (
              // Display mode - token is stored
              <>
                <Key className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span className="text-xs text-muted-foreground">Token stored</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTempToken(config.authToken);
                    setIsEditingToken(true);
                  }}
                  className="h-6 text-xs px-2"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearToken}
                  className="h-6 text-xs px-2 text-destructive hover:text-destructive"
                >
                  Clear
                </Button>
              </>
            ) : (
              // Edit mode - entering/updating token
              <>
                <span className="text-xs font-semibold whitespace-nowrap">{authTokenLabel}</span>
                <BasicInput
                  type="text"
                  value={tempToken}
                  onChange={(e) => setTempToken(e.target.value)}
                  placeholder="Enter admin auth token"
                  className="h-7 text-xs flex-1 font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveToken();
                    } else if (e.key === 'Escape' && config.hasToken) {
                      handleCancelEdit();
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleSaveToken}
                  disabled={!tempToken.trim()}
                  className="h-7 text-xs px-2"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                {config.hasToken && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="h-7 text-xs px-2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}
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
      
      {/* Warning if no token */}
      {showAuthToken && !config.hasToken && !isEditingToken && (
        <div className="px-3 py-2 bg-warning/10 border-t border-warning/20">
          <p className="text-xs text-warning-foreground">
            <Key className="h-3 w-3 inline mr-1" />
            No auth token configured. API requests will fail.
          </p>
        </div>
      )}
    </div>
  );
}

