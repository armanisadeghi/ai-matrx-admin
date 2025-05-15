'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch } from '@/lib/redux';
import { brokerConceptActions } from '@/lib/redux/brokerSlice';
import { SLACK_BROKER_IDS } from './components/BrokerSlackClient';

export default function SlackBrokersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const [initialized, setInitialized] = useState(false);

  // Register all the broker mappings
  useEffect(() => {
    // Create broker mappings for all the Slack brokers
    const brokerMappings = Object.entries(SLACK_BROKER_IDS).map(([key, idArgs]) => {
      // Generate a unique brokerId for each mapping
      // In a real app, these would come from the database
      const brokerId = `slack-${idArgs.source}-${idArgs.itemId}-${Date.now()}`;
      
      return {
        source: idArgs.source,
        sourceId: 'slack-integration', // Could be user ID in a real app
        itemId: idArgs.itemId,
        brokerId: brokerId
      };
    });

    // Register all the broker mappings
    dispatch(brokerConceptActions.setMap(brokerMappings));
    
    // Mark as initialized after broker registration
    setInitialized(true);
    
    // Cleanup on unmount
    return () => {
      // Unregister brokers on unmount
      brokerMappings.forEach(mapping => {
        dispatch(brokerConceptActions.removeMapEntry({
          source: mapping.source,
          itemId: mapping.itemId
        }));
      });
    };
  }, [dispatch]);

  // Show loading state until brokers are ready
  if (!initialized) {
    return (
      <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
        <div className="flex items-center justify-center h-32 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-slate-300 dark:bg-slate-600 h-10 w-10"></div>
            <div className="flex-1 space-y-3 py-1">
              <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded"></div>
              <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 