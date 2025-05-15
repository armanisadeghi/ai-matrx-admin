'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { brokerConceptActions, brokerConceptSelectors, useServerBrokerSync } from '@/lib/redux/brokerSlice';
import { SlackChannel } from '../../../slack/slackClientUtils';

// Define broker identifiers
export const SLACK_BROKER_IDS = {
  token: { source: 'api', itemId: 'slack_token' },
  channels: { source: 'slack', itemId: 'slack_channels' },
  selectedChannel: { source: 'slack', itemId: 'selected_channel' },
  filename: { source: 'slack', itemId: 'slack_filename' },
  title: { source: 'slack', itemId: 'slack_title' },
  initialComment: { source: 'slack', itemId: 'slack_initial_comment' },
} as const;

interface BrokerSlackClientProps {
  children: React.ReactNode;
}

export function BrokerSlackClient({ children }: BrokerSlackClientProps) {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Get token from broker
  const token = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.token)
  );
  
  // Get channels list from broker or initialize empty
  const channelsJson = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.channels)
  );
  const channels: SlackChannel[] = channelsJson ? JSON.parse(channelsJson) : [];
  
  // Get selected channel from broker
  const selectedChannel = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.selectedChannel)
  );

  // Sync brokers with server - use syncOnMount: false since we've registered them in SlackBrokerProvider
  useServerBrokerSync({
    brokers: Object.values(SLACK_BROKER_IDS),
    syncOnChange: true,
    syncInterval: 0 // Only sync on changes
  });
  
  // Fetch channels when token changes
  useEffect(() => {
    if (token) {
      fetchChannels();
    }
  }, [token]);
  
  const fetchChannels = async () => {
    if (!token) {
      setError('Token is required to fetch channels');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
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
      
      setSuccess('Channels fetched successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Error fetching channels');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Set selected channel
  const setChannel = (channelId: string) => {
    dispatch(brokerConceptActions.setText({
      idArgs: SLACK_BROKER_IDS.selectedChannel,
      text: channelId
    }));
  };
  
  // Set token
  const setSlackToken = (newToken: string) => {
    dispatch(brokerConceptActions.setText({
      idArgs: SLACK_BROKER_IDS.token,
      text: newToken
    }));
  };

  // Context value - memoize to prevent unnecessary re-renders
  const slackContext = useMemo(() => ({
    token,
    channels,
    selectedChannel,
    isLoading,
    error,
    success,
    fetchChannels,
    setChannel,
    setSlackToken,
    setError: (msg: string | null) => setError(msg),
    setSuccess: (msg: string | null) => {
      setSuccess(msg);
      if (msg) setTimeout(() => setSuccess(null), 3000);
    }
  }), [token, channels, selectedChannel, isLoading, error, success]);

  return (
    <div className="slack-client-context">
      {error && (
        <div className="p-3 mb-4 rounded-md bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 mb-4 rounded-md bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200">
          {success}
        </div>
      )}
      
      {children}
    </div>
  );
} 