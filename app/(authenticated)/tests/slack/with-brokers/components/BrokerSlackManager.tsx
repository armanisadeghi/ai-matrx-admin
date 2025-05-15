'use client';

import { useState, useMemo, useCallback } from 'react';
import { TokenManager } from './TokenManager';
import { ChannelSelector } from './ChannelSelector';
import { BrokerFileUploader } from './BrokerFileUploader';
import { BrokerSlackClient } from './BrokerSlackClient';
import { useAppSelector } from '@/lib/redux';
import { brokerConceptSelectors } from '@/lib/redux/brokerSlice';
import { SLACK_BROKER_IDS } from './BrokerSlackClient';

export function BrokerSlackManager() {
  const [activeTab, setActiveTab] = useState<'message' | 'upload'>('upload');
  
  // Get token and channel from broker
  const token = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.token)
  );
  const selectedChannel = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.selectedChannel)
  );
  
  // Tab change handler - memoized
  const handleTabChange = useCallback((tab: 'message' | 'upload') => {
    setActiveTab(tab);
  }, []);
  
  // Memoize tab button class computation
  const getTabButtonClass = useCallback((tab: 'message' | 'upload') => {
    return `px-3 py-2 font-medium text-sm rounded-t-lg ${
      activeTab === tab
        ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-b-2 border-slate-500'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;
  }, [activeTab]);
  
  // Memoize the warning content based on token and selectedChannel
  const warningContent = useMemo(() => {
    if (!token || !selectedChannel) {
      return (
        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          <h3 className="font-semibold mb-2">Getting Started:</h3>
          <ul className="list-disc pl-5 space-y-1">
            {!token && (
              <li>First, enter your Slack token or select a saved one from the Token Management section</li>
            )}
            {token && !selectedChannel && (
              <li>Select a channel from the dropdown</li>
            )}
          </ul>
        </div>
      );
    }
    return null;
  }, [token, selectedChannel]);
  
  // Memoize the tab content
  const tabContent = useMemo(() => {
    if (activeTab === 'message') {
      return (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Send a Message</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Message functionality will be implemented in the next phase.
          </p>
        </div>
      );
    } else {
      return <BrokerFileUploader />;
    }
  }, [activeTab]);
  
  return (
    <BrokerSlackClient>
      <div className="space-y-8 p-6 bg-white dark:bg-slate-900 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Slack Integration with Brokers</h1>
        
        {/* Token Management */}
        <div className="p-4 rounded-lg shadow border border-slate-300 dark:border-slate-700">
          <TokenManager />
        </div>
        
        {/* Channel Selector */}
        <div className="p-4 rounded-lg shadow border border-slate-300 dark:border-slate-700">
          <ChannelSelector />
        </div>
        
        {/* Tabs for different actions */}
        <div className="border-b border-slate-300 dark:border-slate-700">
          <nav className="flex space-x-1" aria-label="Tabs">
            <button
              onClick={() => handleTabChange('message')}
              className={getTabButtonClass('message')}
            >
              Send Message
            </button>
            <button
              onClick={() => handleTabChange('upload')}
              className={getTabButtonClass('upload')}
            >
              Upload File
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="p-4 rounded-lg shadow border border-slate-300 dark:border-slate-700">
          {tabContent}
        </div>
        
        {/* Instructions */}
        {warningContent}
      </div>
    </BrokerSlackClient>
  );
} 