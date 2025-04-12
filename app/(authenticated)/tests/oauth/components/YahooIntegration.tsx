import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OAuthProvider from './OAuthProvider';
import YahooData from './YahooData';
import { startOAuthFlow, exchangeCodeForToken, generateMockData } from '../utils/oauth';
import { OAUTH_PROVIDERS } from '../providers/providers';
import { ProviderState } from '../types/oauth';

const YahooIntegration: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for tracking Yahoo authentication
  const [yahooState, setYahooState] = useState<ProviderState>({
    isLoading: false,
    isConnected: false,
    token: null,
    data: null,
    error: null
  });

  // Check for OAuth callback parameters on component mount
  useEffect(() => {
    const provider = searchParams.get('provider');
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    if (provider === 'yahoo' && code) {
      handleOAuthCallback(code);
    } else if (provider === 'yahoo' && error) {
      setYahooState(prev => ({
        ...prev,
        isLoading: false,
        error: error || 'Authentication failed'
      }));
    }
    
    // Clear URL parameters after processing
    if (provider || code || error) {
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // Handle OAuth callback - exchange code for token
  const handleOAuthCallback = async (code: string) => {
    setYahooState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // In a real app, this would call the backend to exchange the code for a token
      // For demo purposes, we're using mock data
      // const tokenData = await exchangeCodeForToken('yahoo', code);
      
      // Using mock data for demonstration
      const tokenData = generateMockData('yahoo');
      
      setYahooState({
        isLoading: false,
        isConnected: true,
        token: tokenData.access_token,
        data: tokenData,
        error: null
      });
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      setYahooState({
        isLoading: false,
        isConnected: false,
        token: null,
        data: null,
        error: 'Failed to authenticate with Yahoo'
      });
    }
  };

  // Handle connect button click
  const handleConnect = () => {
    setYahooState(prev => ({ ...prev, isLoading: true }));
    startOAuthFlow(OAUTH_PROVIDERS.yahoo);
  };

  // Handle disconnect button click
  const handleDisconnect = () => {
    setYahooState({
      isLoading: false,
      isConnected: false,
      token: null,
      data: null,
      error: null
    });
  };

  // Show mock data for demonstration
  const handleShowMockData = () => {
    const mockData = generateMockData('yahoo');
    setYahooState({
      isLoading: false,
      isConnected: true,
      token: mockData.access_token,
      data: mockData,
      error: null
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Yahoo Integration</h1>
      
      {/* Yahoo OAuth Provider */}
      <OAuthProvider
        config={OAUTH_PROVIDERS.yahoo}
        state={yahooState}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onShowMockData={handleShowMockData}
      />
      
      {/* Display Yahoo Data when connected */}
      {yahooState.isConnected && yahooState.token && (
        <YahooData token={yahooState.token} />
      )}
      
      {yahooState.isConnected && (
        <div className="mt-8 bg-gray-50 p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">Integration Status</h3>
          <p className="text-gray-700 mb-4">
            Your Yahoo account is successfully connected with read and write access to emails, calendar, and contacts.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  This is a mock integration. In a production environment, you would connect to the actual Yahoo API to read and write emails, calendar events, and contacts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YahooIntegration;