'use client';

import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { brokerConceptActions, brokerConceptSelectors } from '@/lib/redux/brokerSlice';
import { SLACK_BROKER_IDS } from './BrokerSlackClient';
import { useState, useMemo, useCallback } from 'react';

export function ChannelSelector() {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get token from broker
  const token = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.token)
  );
  
  // Get channels list from broker or initialize empty
  const channelsJson = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.channels)
  );
  
  // Memoize the parsed channels to prevent unnecessary re-renders
  const channels = useMemo(() => {
    if (!channelsJson) return [];
    try {
      return JSON.parse(channelsJson);
    } catch (e) {
      console.error('Error parsing channels JSON:', e);
      return [];
    }
  }, [channelsJson]);
  
  // Get selected channel from broker
  const selectedChannel = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.selectedChannel)
  );
  
  // Memoize the fetch channels function to prevent unnecessary re-renders
  const fetchChannels = useCallback(async () => {
    if (!token) {
      return;
    }
    
    setIsLoading(true);
    
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
    } catch (err) {
      console.error('Error fetching channels:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, dispatch]);
  
  // Select a channel - memoize this function
  const handleChannelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(brokerConceptActions.setText({
      idArgs: SLACK_BROKER_IDS.selectedChannel,
      text: e.target.value
    }));
  }, [dispatch]);
  
  // Get selected channel name - memoize the result
  const selectedChannelName = useMemo(() => {
    const channel = channels.find((c: any) => c.id === selectedChannel);
    return channel ? `#${channel.name}` : selectedChannel;
  }, [channels, selectedChannel]);
  
  return (
    <div className="space-y-2">
      <label className="block font-medium text-slate-800 dark:text-slate-200">Channel:</label>
      <div className="flex gap-2">
        <select
          value={selectedChannel || ''}
          onChange={handleChannelChange}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
          disabled={isLoading || channels.length === 0}
        >
          <option value="">Select a channel</option>
          {channels.map((channel: any) => (
            <option key={channel.id} value={channel.id} className="bg-white dark:bg-slate-800">
              #{channel.name}
            </option>
          ))}
        </select>
        
        <button
          onClick={fetchChannels}
          disabled={!token || isLoading}
          className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {selectedChannel && (
        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
          <p className="text-sm flex items-center text-slate-800 dark:text-slate-200">
            <span className="bg-green-600 h-2 w-2 rounded-full mr-2"></span>
            Current target: {selectedChannelName}
          </p>
        </div>
      )}
    </div>
  );
} 