"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  startOAuthFlow,
  exchangeCodeForToken,
  generateMockData,
} from "./utils/oauth";
import { ProviderState } from "./types/oauth";
import { OAUTH_PROVIDERS } from "./providers/providers";
import OAuthProvider from "./components/OAuthProvider";
import TokenDisplay from "./components/TokenDisplay";

export default function Home() {
  const searchParams = useSearchParams();
  const [providerStates, setProviderStates] = useState<
    Record<string, ProviderState>
  >({});

  // Initialize provider states
  useEffect(() => {
    const initialStates: Record<string, ProviderState> = {};

    Object.keys(OAUTH_PROVIDERS).forEach((provider) => {
      initialStates[provider] = {
        isLoading: false,
        isConnected: false,
        token: null,
        data: null,
        error: null,
      };
    });

    setProviderStates(initialStates);
  }, []);

  // Handle OAuth callbacks via URL parameters
  useEffect(() => {
    const provider = searchParams.get("provider");
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (!provider || !Object.keys(OAUTH_PROVIDERS).includes(provider)) return;

    // Handle error from OAuth provider
    if (error) {
      console.error(`Authentication error for ${provider}:`, error);
      setProviderStates((current) => ({
        ...current,
        [provider]: {
          ...current[provider],
          isLoading: false,
          error: `Authentication error: ${error}`,
        },
      }));

      // Clean up URL parameters
      window.history.replaceState({}, "", "/");
      return;
    }

    // Handle successful authorization code
    if (code) {
      console.log(`Received ${provider} authorization code, processing...`);
      handleAuthCode(provider, code);

      // Clean up URL parameters
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams]);

  // Handle the authorization code
  const handleAuthCode = async (provider: string, code: string) => {
    console.log(`Starting token exchange for ${provider}`);
    
    // Update loading state
    setProviderStates((current) => ({
      ...current,
      [provider]: {
        ...current[provider],
        isLoading: true,
        error: null,
      },
    }));

    try {
      // Exchange the code for a token
      const data = await exchangeCodeForToken(provider, code);

      console.log(`Successfully connected to ${provider}`);
      
      // Update state with token and data
      setProviderStates((current) => ({
        ...current,
        [provider]: {
          ...current[provider],
          isLoading: false,
          isConnected: true,
          token: data.access_token,
          data,
        },
      }));

      // Log to console
      console.log(`${provider} access token:`, data.access_token);
      console.log(`${provider} data:`, data);
    } catch (err) {
      // Handle errors
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";

      console.error(`Error during ${provider} token exchange:`, errorMessage);
      
      setProviderStates((current) => ({
        ...current,
        [provider]: {
          ...current[provider],
          isLoading: false,
          error: errorMessage,
        },
      }));
    }
  };

  // Start OAuth flow for a provider
  const handleConnect = (provider: string) => {
    console.log(`Initiating connection to ${provider}`);
    
    // Update loading state
    setProviderStates((current) => ({
      ...current,
      [provider]: {
        ...current[provider],
        isLoading: true,
        error: null,
      },
    }));

    // Start the OAuth flow
    const config = OAUTH_PROVIDERS[provider];
    startOAuthFlow(config);
  };

  // Load mock data for a provider
  const handleShowMockData = (provider: string) => {
    console.log(`Loading mock data for ${provider}`);
    const mockData = generateMockData(provider);

    setProviderStates((current) => ({
      ...current,
      [provider]: {
        ...current[provider],
        isConnected: true,
        token: mockData.access_token,
        data: mockData,
      },
    }));

    // Log mock data to console
    console.log(`${provider} access token (mock):`, mockData.access_token);
    console.log(`${provider} data (mock):`, mockData);
  };

  // Disconnect a provider
  const handleDisconnect = (provider: string) => {
    console.log(`Disconnecting from ${provider}`);
    
    setProviderStates((current) => ({
      ...current,
      [provider]: {
        isLoading: false,
        isConnected: false,
        token: null,
        data: null,
        error: null,
      },
    }));
  };

  // Count connected providers
  const connectedCount = Object.values(providerStates).filter(
    (state) => state.isConnected
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Integrations Dashboard</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Render provider components */}
          {Object.entries(OAUTH_PROVIDERS).map(([providerId, config]) => (
            <OAuthProvider
              key={providerId}
              config={config}
              state={
                providerStates[providerId] || {
                  isLoading: false,
                  isConnected: false,
                  token: null,
                  data: null,
                  error: null,
                }
              }
              onConnect={() => handleConnect(providerId)}
              onDisconnect={() => handleDisconnect(providerId)}
              onShowMockData={() => handleShowMockData(providerId)}
            />
          ))}
        </div>

        {/* Token display component */}
        <TokenDisplay providerStates={providerStates} />

        {/* Connected services summary */}
        {connectedCount > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Connected Services</h2>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex flex-wrap gap-3">
                {Object.entries(providerStates)
                  .filter(([_, state]) => state.isConnected)
                  .map(([provider, _]) => (
                    <div
                      key={provider}
                      className={`bg-${OAUTH_PROVIDERS[provider].color}/10 text-${OAUTH_PROVIDERS[provider].color} px-3 py-1 rounded-full text-sm flex items-center`}
                    >
                      <span className="w-4 h-4 mr-1">
                        {OAUTH_PROVIDERS[provider].iconSvg}
                      </span>
                      <span>{OAUTH_PROVIDERS[provider].name}</span>
                    </div>
                  ))}
              </div>

              <div className="mt-4 text-sm text-gray-500">
                <p>
                  Access tokens for all connected services are available in the
                  browser console and in the Access Tokens section above.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}