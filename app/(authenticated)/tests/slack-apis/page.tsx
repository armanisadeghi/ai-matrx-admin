'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlackTokenResponse } from './types/slack';

export default function Home() {
  const searchParams = useSearchParams();
  const [isLoadingSlack, setIsLoadingSlack] = useState<boolean>(false);
  const [slackToken, setSlackToken] = useState<string | null>(null);
  const [slackData, setSlackData] = useState<SlackTokenResponse | null>(null);
  const [slackError, setSlackError] = useState<string | null>(null);

  // Slack OAuth
  const slackClientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
  const slackRedirectUri = `${process.env.NEXT_PUBLIC_SLACK_REDIRECT_URL}/api/slack-callback`;

  // Function to initiate Slack OAuth flow
  const connectToSlack = () => {
    setIsLoadingSlack(true);

    // Define the scopes you're requesting access to
    const scopes = [
      'chat:write',
      'channels:read',
      'team:read',
      'users:read'
    ].join(',');

    // Construct the authorization URL
    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${slackClientId}&redirect_uri=${encodeURIComponent(slackRedirectUri)}&scope=${encodeURIComponent(scopes)}`;

    // Redirect to Slack's authorization page
    window.location.href = authUrl;
  };

  // Process the code from URL parameters when the component mounts
  useEffect(() => {
    const slackCode = searchParams.get('slackCode');
    const slackErrorParam = searchParams.get('slackError');
    
    if (slackErrorParam) {
      setSlackError(`Authentication error: ${slackErrorParam}`);
      setIsLoadingSlack(false);
      return;
    }

    if (slackCode) {
      handleSlackAuthCode(slackCode);
      // Remove the code from the URL to prevent re-processing on refresh
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams]);

  // Handle the Slack authorization code
  const handleSlackAuthCode = async (code: string) => {
    setIsLoadingSlack(true);
    setSlackError(null);

    try {
      const response = await fetch('/api/slack-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to exchange authorization code');
      }

      setSlackToken(data.access_token);
      setSlackData(data);
      
      // Log the token to console
      console.log('Slack access token:', data.access_token);
      console.log('Slack data:', data);
    } catch (err) {
      if (err instanceof Error) {
        setSlackError(err.message);
      } else {
        setSlackError('An unknown error occurred');
      }
    } finally {
      setIsLoadingSlack(false);
    }
  };

  // For demo purposes: dummy data
  const showDummyData = () => {
    const dummyData = {
      ok: true,
      access_token: 'test-toke',
      token_type: 'bot',
      scope: 'chat:write,channels:read,team:read,users:read',
      bot_user_id: 'U01ABCD1234',
      app_id: 'A01ABCD5678',
      team: {
        id: 'T01ABCDEFGH',
        name: 'Acme Team',
        domain: 'acme-team'
      },
      authed_user: {
        id: 'U01ABC7890',
        name: 'johndoe',
        email: 'john@example.com'
      }
    };
    
    setSlackToken(dummyData.access_token);
    setSlackData(dummyData as SlackTokenResponse);
    
    // Log the dummy token to console
    console.log('Slack access token (dummy):', dummyData.access_token);
    console.log('Slack data (dummy):', dummyData);
  };

  const resetSlackConnection = () => {
    setSlackToken(null);
    setSlackData(null);
    setSlackError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Integrations Dashboard</h1>

        <div className="grid md:grid-cols-1 gap-6">
          {/* Slack Integration Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-purple-600" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.687 8.834a2.528 2.528 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.522A2.527 2.527 0 0 1 15.166 0a2.528 2.528 0 0 1 2.521 2.522v6.312zM15.166 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.166 24a2.527 2.527 0 0 1-2.521-2.522v-2.522h2.521zM15.166 17.687a2.527 2.527 0 0 1-2.521-2.521 2.526 2.526 0 0 1 2.521-2.521h6.312A2.527 2.527 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" />
              </svg>
              <h2 className="text-xl font-semibold ml-2">Slack</h2>
            </div>
            
            {slackError && (
              <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>Error: {slackError}</p>
              </div>
            )}

            {/* Connection States */}
            {isLoadingSlack ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <span className="ml-2">Processing Slack authentication...</span>
              </div>
            ) : !slackToken ? (
              <div>
                <p className="mb-4">
                  Connect to your Slack workspace to send messages and access data.
                </p>
                <div className="flex flex-col space-y-3">
                  <button
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded flex items-center justify-center"
                    onClick={connectToSlack}
                  >
                    <span>Connect to Slack</span>
                  </button>
                  <button
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded flex items-center justify-center"
                    onClick={showDummyData}
                  >
                    <span>Show Demo Data</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Token and connection information */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Access Token</h3>
                  <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                    <code className="text-sm break-all">{slackToken}</code>
                  </div>
                </div>

                {slackData && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Workspace Information</h3>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-500 font-medium">Workspace</p>
                          <p>{slackData.team.name}</p>
                        </div>
                        {slackData.team.domain && (
                          <div>
                            <p className="text-gray-500 font-medium">Domain</p>
                            <p>{slackData.team.domain}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-500 font-medium">Team ID</p>
                          <p className="font-mono text-sm">{slackData.team.id}</p>
                        </div>
                        {slackData.authed_user && (
                          <div>
                            <p className="text-gray-500 font-medium">Authenticated User</p>
                            <p>{slackData.authed_user.name || slackData.authed_user.id}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <p className="text-gray-500 font-medium mb-2">Scopes</p>
                        <div className="flex flex-wrap gap-2">
                          {slackData.scope.split(',').map((scope, index) => (
                            <span
                              key={index}
                              className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded"
                            >
                              {scope.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
                  onClick={resetSlackConnection}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}