// hooks/useServerBrokerSync.ts
import { useEffect, useRef, useMemo } from 'react';
import { useAppSelector } from '@/lib/redux';
import { brokerSelectors, BrokerIdentifier } from '@/lib/redux/brokerSlice';
import { createSelector } from 'reselect';
import { RootState } from '@/lib/redux';

interface SyncConfig {
  brokers: BrokerIdentifier[];
  syncInterval?: number;
  syncOnChange?: boolean;
}

export function useServerBrokerSync({ brokers, syncInterval = 30000, syncOnChange = true }: SyncConfig) {
  const lastSyncRef = useRef<Record<string, any>>({});
  
  // Create a stable reference to the brokers array
  const stableBrokers = useMemo(() => brokers, [
    // We stringify the brokers to create a proper dependency
    JSON.stringify(brokers.map(b => {
      // Handle both variants of the BrokerIdentifier type
      if ('brokerId' in b) {
        return `brokerId:${b.brokerId}`;
      } else {
        return `${b.source}:${b.id}`;
      }
    }))
  ]);
  
  // Create a memoized selector that will only recompute when the actual values change
  const selectBrokerValues = useMemo(() => {
    return createSelector(
      [(state: RootState) => state.brokerConcept],
      (brokerConcept) => {
        const values: Record<string, any> = {};
        stableBrokers.forEach(idArgs => {
          const key = JSON.stringify(idArgs);
          // Use existing helpers to get broker values
          const brokerId = brokerSelectors.selectBrokerId(
            { brokerConcept } as RootState, 
            idArgs
          );
          values[key] = brokerId ? brokerConcept.brokers[brokerId] : undefined;
        });
        return values;
      }
    );
  }, [stableBrokers]);
  
  // Get current broker values using our memoized selector
  const brokerValues = useAppSelector(selectBrokerValues);

  // Sync function
  const syncToServer = async () => {
    const brokersToSync = [];
    
    // Check which brokers have changed
    stableBrokers.forEach(idArgs => {
      const key = JSON.stringify(idArgs);
      const currentValue = brokerValues[key];
      
      if (syncOnChange && lastSyncRef.current[key] === currentValue) {
        return; // Skip unchanged values
      }
      
      brokersToSync.push({
        idArgs,
        value: currentValue
      });
      
      lastSyncRef.current[key] = currentValue;
    });

    if (brokersToSync.length > 0) {
      try {
        await fetch('/api/brokers/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brokers: brokersToSync })
        });
      } catch (error) {
        console.error('Broker sync failed:', error);
      }
    }
  };

  // Sync on mount and on interval
  useEffect(() => {
    syncToServer();
    
    if (syncInterval > 0) {
      const interval = setInterval(syncToServer, syncInterval);
      return () => clearInterval(interval);
    }
  }, [syncInterval, stableBrokers]);

  // Sync on broker changes
  useEffect(() => {
    if (syncOnChange) {
      syncToServer();
    }
  }, [brokerValues, syncOnChange]);

  return { syncToServer };
}