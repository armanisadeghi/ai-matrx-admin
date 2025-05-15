'use client';

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { brokerConceptActions, brokerConceptSelectors } from '@/lib/redux/brokerSlice';
import { SLACK_BROKER_IDS } from './BrokerSlackClient';

// Define scopes required for our Slack app
const scopes = [
  'app_mentions:read',
  'channels:read',
  'channels:join',
  'chat:write',
  'commands',
  'files:read',
  'files:write',
  'users:read',
  'groups:read',
];

export function SlackAuthentication() {
  const dispatch = useAppDispatch();
  const [savedTokens, setSavedTokens] = useState<string[]>([]);
  const [authUrl, setAuthUrl] = useState<string>('');
  
  // Get token from broker
  const token = useAppSelector(state => 
    brokerConceptSelectors.selectText(state, SLACK_BROKER_IDS.token)
  );
  
  useEffect(() => {
    // Get environment variables
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_SLACK_REDIRECT_URL;
    
    if (clientId && redirectUri) {
      // Use the configured redirect URL with the OAuth callback path
      // This must match what's registered in your Slack app settings
      const callbackUrl = `${redirectUri}/api/slack/oauth/callback`;
      const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes.join(',')}&redirect_uri=${encodeURIComponent(callbackUrl)}`;
      setAuthUrl(url);
    }
    
    // Check for tokens in localStorage
    const storedTokens = localStorage.getItem('slackTokens');
    if (storedTokens) {
      const parsedTokens = JSON.parse(storedTokens);
      setSavedTokens(parsedTokens);
      
      // Auto-select first token if we have one and no token is set
      if (parsedTokens.length > 0 && !token) {
        dispatch(brokerConceptActions.setText({
          idArgs: SLACK_BROKER_IDS.token,
          text: parsedTokens[0]
        }));
      }
    }
    
    // Check for token in URL (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (urlToken) {
      // Save to broker
      dispatch(brokerConceptActions.setText({
        idArgs: SLACK_BROKER_IDS.token,
        text: urlToken
      }));
      
      // Save to localStorage
      const updatedTokens = storedTokens 
        ? [...JSON.parse(storedTokens).filter((t: string) => t !== urlToken), urlToken]
        : [urlToken];
      
      localStorage.setItem('slackTokens', JSON.stringify(updatedTokens));
      setSavedTokens(updatedTokens);
      
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [dispatch, token]);
  
  // Add token manually
  const handleManualTokenAdd = () => {
    const newToken = prompt("Enter your Slack OAuth token (xoxb-...)");
    if (newToken && newToken.trim()) {
      // Save to broker
      dispatch(brokerConceptActions.setText({
        idArgs: SLACK_BROKER_IDS.token,
        text: newToken
      }));
      
      // Save to localStorage
      const updatedTokens = [...savedTokens.filter(t => t !== newToken), newToken];
      localStorage.setItem('slackTokens', JSON.stringify(updatedTokens));
      setSavedTokens(updatedTokens);
    }
  };
  
  // Remove token
  const handleRemoveToken = () => {
    if (token) {
      // Remove from broker
      dispatch(brokerConceptActions.setText({
        idArgs: SLACK_BROKER_IDS.token,
        text: ''
      }));
      
      // Remove from localStorage
      const updatedTokens = savedTokens.filter(t => t !== token);
      localStorage.setItem('slackTokens', JSON.stringify(updatedTokens));
      setSavedTokens(updatedTokens);
    }
  };
  
  if (!token) {
    return (
      <div className="mb-6 p-6 bg-white dark:bg-slate-900 rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Connect to Slack</h2>
          <p className="mb-6 text-slate-600 dark:text-slate-400">
            To use this integration, please connect your Slack workspace.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {authUrl ? (
              <a 
                href={authUrl}
                className="flex items-center justify-center gap-2 bg-[#4A154B] hover:bg-[#611f64] text-white py-2 px-4 rounded-md transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.712 33.642c0 2.862-2.332 5.193-5.193 5.193-2.862 0-5.193-2.331-5.193-5.193 0-2.861 2.331-5.192 5.193-5.192h5.193v5.192zm2.596 0c0-2.861 2.332-5.192 5.193-5.192 2.861 0 5.192 2.331 5.192 5.192v13.004c0 2.861-2.331 5.192-5.192 5.192-2.861 0-5.193-2.331-5.193-5.192V33.642z" fill="#fff"></path>
                  <path d="M27.5 19.712c-2.861 0-5.192-2.332-5.192-5.193 0-2.862 2.331-5.193 5.192-5.193 2.861 0 5.192 2.331 5.192 5.193v5.193H27.5zm0 2.596c2.861 0 5.192 2.332 5.192 5.193 0 2.861-2.331 5.192-5.192 5.192H14.52c-2.862 0-5.193-2.331-5.193-5.192 0-2.861 2.331-5.193 5.193-5.193H27.5z" fill="#fff"></path>
                  <path d="M41.454 27.5c0-2.861 2.332-5.192 5.193-5.192 2.861 0 5.192 2.331 5.192 5.192 0 2.861-2.331 5.192-5.192 5.192h-5.193V27.5zm-2.596 0c0 2.861-2.332 5.192-5.193 5.192-2.861 0-5.192-2.331-5.192-5.192V14.52c0-2.862 2.331-5.193 5.192-5.193 2.861 0 5.193 2.331 5.193 5.193V27.5z" fill="#fff"></path>
                  <path d="M33.665 41.454c2.861 0 5.192 2.332 5.192 5.193 0 2.861-2.331 5.192-5.192 5.192-2.861 0-5.193-2.331-5.193-5.192v-5.193h5.193zm0-2.596c-2.861 0-5.193-2.332-5.193-5.193 0-2.861 2.332-5.192 5.193-5.192h13.004c2.861 0 5.192 2.331 5.192 5.192 0 2.861-2.331 5.193-5.192 5.193H33.665z" fill="#fff"></path>
                </svg>
                Add to Slack
              </a>
            ) : (
              <button 
                className="bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-300 py-2 px-4 rounded-md cursor-not-allowed"
                disabled
              >
                Slack Configuration Missing
              </button>
            )}
            
            <button
              onClick={handleManualTokenAdd}
              className="flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 py-2 px-4 rounded-md transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Token Manually
            </button>
          </div>
          
          {savedTokens.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-2 text-slate-700 dark:text-slate-300">Saved Tokens:</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {savedTokens.map((savedToken, index) => (
                  <button
                    key={index}
                    className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-1 px-3 rounded-md text-sm transition-colors"
                    onClick={() => {
                      dispatch(brokerConceptActions.setText({
                        idArgs: SLACK_BROKER_IDS.token,
                        text: savedToken
                      }));
                    }}
                  >
                    {savedToken.substring(0, 10)}...
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
            Note: For testing purposes, tokens are stored in localStorage. In production, they should be securely stored on your server.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-[#4A154B] dark:text-[#611f64] mr-2" viewBox="0 0 54 54" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.712 33.642c0 2.862-2.332 5.193-5.193 5.193-2.862 0-5.193-2.331-5.193-5.193 0-2.861 2.331-5.192 5.193-5.192h5.193v5.192zm2.596 0c0-2.861 2.332-5.192 5.193-5.192 2.861 0 5.192 2.331 5.192 5.192v13.004c0 2.861-2.331 5.192-5.192 5.192-2.861 0-5.193-2.331-5.193-5.192V33.642z"></path>
            <path d="M27.5 19.712c-2.861 0-5.192-2.332-5.192-5.193 0-2.862 2.331-5.193 5.192-5.193 2.861 0 5.192 2.331 5.192 5.193v5.193H27.5zm0 2.596c2.861 0 5.192 2.332 5.192 5.193 0 2.861-2.331 5.192-5.192 5.192H14.52c-2.862 0-5.193-2.331-5.193-5.192 0-2.861 2.331-5.193 5.193-5.193H27.5z"></path>
            <path d="M41.454 27.5c0-2.861 2.332-5.192 5.193-5.192 2.861 0 5.192 2.331 5.192 5.192 0 2.861-2.331 5.192-5.192 5.192h-5.193V27.5zm-2.596 0c0 2.861-2.332 5.192-5.193 5.192-2.861 0-5.192-2.331-5.192-5.192V14.52c0-2.862 2.331-5.193 5.192-5.193 2.861 0 5.193 2.331 5.193 5.193V27.5z"></path>
            <path d="M33.665 41.454c2.861 0 5.192 2.332 5.192 5.193 0 2.861-2.331 5.192-5.192 5.192-2.861 0-5.193-2.331-5.193-5.192v-5.193h5.193zm0-2.596c-2.861 0-5.193-2.332-5.193-5.193 0-2.861 2.332-5.192 5.193-5.192h13.004c2.861 0 5.192 2.331 5.192 5.192 0 2.861-2.331 5.193-5.192 5.193H33.665z" fill="#fff"></path>
          </svg>
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">Connected to Slack</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Token: {token.substring(0, 12)}...</p>
          </div>
        </div>
        <button
          onClick={handleRemoveToken}
          className="text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
          aria-label="Disconnect Slack"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
} 