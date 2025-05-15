'use client';

import { useAppSelector, useAppDispatch } from '@/lib/redux';
import { brokerConceptSelectors, brokerConceptActions } from '@/lib/redux/brokerSlice';
import { SLACK_BROKER_IDS } from './BrokerSlackClient';
import { SlackChannel } from '../../../slack/slackClientUtils';

export function ChannelSelector() {
  const dispatch = useAppDispatch();
  
  // Get token and channel data from brokers
  const token = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.token)
  );
  const channelsJson = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.channels)
  );
  const selectedChannel = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.selectedChannel)
  );
  
  // Parse channels or use empty array if not available
  const channels: SlackChannel[] = channelsJson ? JSON.parse(channelsJson) : [];
  
  // No token = no channels to select
  if (!token) {
    return null;
  }
  
  // Handle channel selection
  const handleChannelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(brokerConceptActions.setText({
      idArgs: SLACK_BROKER_IDS.selectedChannel,
      text: e.target.value
    }));
  };
  
  // Refresh channels
  const handleRefreshChannels = async () => {
    try {
      const response = await fetch('/api/slack/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'conversations.list',
          method: 'GET',
          token
        })
      });
      
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch channels');
      }
      
      const channelsList = (data.channels || []).map((channel: any) => ({
        id: channel.id,
        name: channel.name
      }));
      
      // Store channels in broker
      dispatch(brokerConceptActions.setText({
        idArgs: SLACK_BROKER_IDS.channels,
        text: JSON.stringify(channelsList)
      }));
    } catch (error) {
      console.error('Error refreshing channels:', error);
    }
  };
  
  return (
    <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label htmlFor="channel-select" className="font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
          Select Channel:
        </label>
        
        <div className="flex-1 flex gap-2">
          <select
            id="channel-select"
            value={selectedChannel || ''}
            onChange={handleChannelSelect}
            className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md p-2 focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
          >
            <option value="">Select a channel</option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>
                #{channel.name}
              </option>
            ))}
          </select>
          
          <button
            onClick={handleRefreshChannels}
            className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 p-2 rounded-md transition-colors"
            aria-label="Refresh Channels"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
} 