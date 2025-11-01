// components/admin/debug/TokenStatusDebug.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { tokenRefreshManager } from '@/utils/auth/TokenRefreshManager';
import { useAppSelector } from '@/lib/redux/hooks';
import { Clock, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';

/**
 * TokenStatusDebug
 * 
 * Debug component for administrators to monitor token refresh status.
 * Shows token expiry time, refresh status, and allows manual refresh.
 */
export default function TokenStatusDebug() {
  const [status, setStatus] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const accessToken = useAppSelector(state => state.user.accessToken);
  const tokenExpiresAt = useAppSelector(state => state.user.tokenExpiresAt);

  const loadStatus = async () => {
    const currentStatus = await tokenRefreshManager.getTokenStatus();
    setStatus(currentStatus);
    setLastUpdate(new Date());
  };

  useEffect(() => {
    loadStatus();
    
    // Auto-refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    await tokenRefreshManager.forceRefresh();
    await loadStatus();
    setIsRefreshing(false);
  };

  const storedInfo = tokenRefreshManager.getStoredTokenInfo();

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Token Refresh Status
        </h3>
        <Badge variant={status?.isActive ? 'default' : 'destructive'}>
          {status?.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Has Access Token</div>
          <div className="flex items-center gap-2">
            {accessToken ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Yes ({accessToken.slice(0, 20)}...)</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">No Token</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Session Active</div>
          <div className="flex items-center gap-2">
            {status?.isActive ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Yes</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">No</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expiry Information */}
      {status?.isActive && (
        <div className="space-y-3 border-t pt-4">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Token Expires At</div>
            <div className="text-sm font-mono">
              {status.expiresAt?.toLocaleString()}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Time Until Expiry</div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-semibold">{status.expiresIn}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Needs Refresh</div>
            <div className="flex items-center gap-2">
              {status.needsRefresh ? (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Yes - Will refresh soon</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">No - Token is fresh</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Redux State */}
      <div className="space-y-2 border-t pt-4">
        <div className="text-sm text-muted-foreground">Redux State</div>
        <div className="text-xs font-mono bg-muted p-2 rounded">
          <div>tokenExpiresAt: {tokenExpiresAt || 'null'}</div>
          {tokenExpiresAt && (
            <div>
              Expires: {new Date(tokenExpiresAt * 1000).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* localStorage Info */}
      {storedInfo && (
        <div className="space-y-2 border-t pt-4">
          <div className="text-sm text-muted-foreground">localStorage Info</div>
          <div className="text-xs font-mono bg-muted p-2 rounded">
            <div>expiresAt: {storedInfo.expiresAt}</div>
            <div>lastChecked: {new Date(storedInfo.lastChecked).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 border-t pt-4">
        <Button 
          onClick={loadStatus} 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Status
        </Button>
        <Button 
          onClick={handleForceRefresh} 
          variant="default" 
          size="sm"
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Force Token Refresh
        </Button>
      </div>

      {/* Info Note */}
      <div className="flex gap-2 items-start text-xs text-muted-foreground border-t pt-4">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          Tokens are automatically refreshed when they're within 3 days of expiry.
          The system checks every 5 minutes in the background.
          Last update: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>
    </Card>
  );
}

