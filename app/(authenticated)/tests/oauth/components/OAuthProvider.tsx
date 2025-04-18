import React, { useState } from 'react';
import { OAuthProviderConfig, ProviderState } from '../types/oauth';

interface OAuthProviderProps {
  config: OAuthProviderConfig;
  state: ProviderState;
  onConnect: () => void;
  onDisconnect: () => void;
  onShowMockData?: () => void;
}

export default function OAuthProvider({ 
  config, 
  state, 
  onConnect, 
  onDisconnect,
  onShowMockData 
}: OAuthProviderProps) {
  const [showToken, setShowToken] = useState(false);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center mb-4">
        <div className={`text-${config.color}`}>
          {config.iconSvg}
        </div>
        <h2 className="text-xl font-semibold ml-2 text-gray-800">{config.name}</h2>
      </div>

      {state.error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">{state.error}</p>
        </div>
      )}

      {state.isLoading ? (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          <span className="ml-2">Connecting to {config.name}...</span>
        </div>
      ) : !state.isConnected ? (
        <div>
          <p className="mb-4 text-gray-600">
            Connect to your {config.name} account to access data and services.
          </p>
          <div className="flex flex-col space-y-3">
            <button
              className={`bg-${config.color} hover:bg-${config.color}/90 text-${config.textColor || 'white'} font-medium py-2 px-4 rounded flex items-center justify-center`}
              onClick={onConnect}
            >
              <span>Connect to {config.name}</span>
            </button>
            
            {onShowMockData && (
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded flex items-center justify-center"
                onClick={onShowMockData}
              >
                <span>Show Demo Data</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Connected state with token and data display */}
          {state.token && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Access Token</h3>
                <button 
                  onClick={() => setShowToken(!showToken)}
                  className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  {showToken ? 'Hide' : 'Show'} Token
                </button>
              </div>
              
              {showToken ? (
                <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                  <code className="text-sm break-all">{state.token}</code>
                </div>
              ) : (
                <div className="bg-gray-100 p-4 rounded-md">
                  <p className="text-sm text-gray-500">Token is hidden. Click "Show Token" to reveal.</p>
                </div>
              )}
            </div>
          )}

          {/* Provider-specific data rendering */}
          {renderProviderData(config.name, state.data)}

          <button
            className="mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

function renderProviderData(provider: string, data: any) {
  if (!data) return null;

  // Provider-specific rendering
  switch (provider.toLowerCase()) {
    case 'slack':
      return renderSlackData(data);
    case 'microsoft office':
      return renderMicrosoftData(data);
    case 'twitter (x)':
      return renderTwitterData(data);
    case 'todoist':
      return renderTodoistData(data);
    case 'yahoo':
      return renderYahooData(data);
    default:
      // Generic JSON display for unknown providers
      return (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Provider Data</h3>
          <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
            <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      );
  }
}

function renderSlackData(data: any) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">Workspace Information</h3>
      <div className="bg-gray-50 p-4 rounded-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 font-medium">Workspace</p>
            <p>{data.team.name}</p>
          </div>
          
          {data.team.domain && (
            <div>
              <p className="text-gray-500 font-medium">Domain</p>
              <p>{data.team.domain}</p>
            </div>
          )}
          
          <div>
            <p className="text-gray-500 font-medium">Team ID</p>
            <p className="font-mono text-sm">{data.team.id}</p>
          </div>
          
          {data.bot_user_id && (
            <div>
              <p className="text-gray-500 font-medium">Bot User ID</p>
              <p className="font-mono text-sm">{data.bot_user_id}</p>
            </div>
          )}
          
          {data.authed_user && (
            <div>
              <p className="text-gray-500 font-medium">Authenticated User</p>
              <p>{data.authed_user.name || data.authed_user.id}</p>
              {data.authed_user.email && (
                <p className="text-xs text-gray-500">{data.authed_user.email}</p>
              )}
            </div>
          )}
        </div>

        {data.scope && (
          <div className="mt-4">
            <p className="text-gray-500 font-medium mb-2">Scopes</p>
            <div className="flex flex-wrap gap-2">
              {data.scope.split(',').map((scope: string, i: number) => (
                <span
                  key={i}
                  className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded"
                >
                  {scope.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderYahooData(data: any) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">Yahoo Account Information</h3>
      <div className="bg-gray-50 p-4 rounded-md">
        {data.user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 font-medium">Name</p>
              <p>{data.user.displayName || `${data.user.givenName} ${data.user.familyName}`}</p>
            </div>
            
            {data.user.nickname && (
              <div>
                <p className="text-gray-500 font-medium">Nickname</p>
                <p>{data.user.nickname}</p>
              </div>
            )}
            
            <div>
              <p className="text-gray-500 font-medium">Yahoo ID</p>
              <p className="font-mono text-sm">{data.user.guid || data.xoauth_yahoo_guid}</p>
            </div>
            
            {data.user.emails && data.user.emails.length > 0 && (
              <div>
                <p className="text-gray-500 font-medium">Primary Email</p>
                <p>{data.user.emails.find((email: any) => email.primary)?.handle || data.user.emails[0].handle}</p>
              </div>
            )}
          </div>
        )}

        {data.user && data.user.emails && data.user.emails.length > 1 && (
          <div className="mt-4">
            <p className="text-gray-500 font-medium mb-2">Additional Emails</p>
            <div className="flex flex-col space-y-1">
              {data.user.emails.filter((email: any, idx: number) => idx > 0 || !email.primary).map((email: any, i: number) => (
                <div key={i} className="flex items-center">
                  <span className="text-sm">{email.handle}</span>
                  {email.type && (
                    <span className="ml-2 bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded">
                      {email.type}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.scope && (
          <div className="mt-4">
            <p className="text-gray-500 font-medium mb-2">Scopes</p>
            <div className="flex flex-wrap gap-2">
              {data.scope.split(' ').map((scope: string, i: number) => (
                <span
                  key={i}
                  className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded"
                >
                  {scope.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {data.expires_in && (
          <div className="mt-4">
            <p className="text-gray-500 font-medium">Token Expires In</p>
            <p>{Math.floor(data.expires_in / 60)} minutes</p>
          </div>
        )}
      </div>
    </div>
  );
}

function renderMicrosoftData(data: any) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">Microsoft Account Information</h3>
      <div className="bg-gray-50 p-4 rounded-md">
        {data.user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 font-medium">Display Name</p>
              <p>{data.user.displayName}</p>
            </div>
            
            {data.user.mail && (
              <div>
                <p className="text-gray-500 font-medium">Email</p>
                <p>{data.user.mail}</p>
              </div>
            )}
            
            <div>
              <p className="text-gray-500 font-medium">User ID</p>
              <p className="font-mono text-sm">{data.user.id}</p>
            </div>
            
            <div>
              <p className="text-gray-500 font-medium">Principal Name</p>
              <p className="font-mono text-sm">{data.user.userPrincipalName}</p>
            </div>
          </div>
        )}

        {data.scope && (
          <div className="mt-4">
            <p className="text-gray-500 font-medium mb-2">Scopes</p>
            <div className="flex flex-wrap gap-2">
              {data.scope.split(' ').map((scope: string, i: number) => (
                <span
                  key={i}
                  className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded"
                >
                  {scope.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {data.expires_in && (
          <div className="mt-4">
            <p className="text-gray-500 font-medium">Token Expires In</p>
            <p>{Math.floor(data.expires_in / 60)} minutes</p>
          </div>
        )}
      </div>
    </div>
  );
}

function renderTwitterData(data: any) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">Twitter Account Information</h3>
      <div className="bg-gray-50 p-4 rounded-md">
        {data.user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 font-medium">Name</p>
              <p>{data.user.name}</p>
            </div>
            
            <div>
              <p className="text-gray-500 font-medium">Username</p>
              <p>@{data.user.username}</p>
            </div>
            
            <div>
              <p className="text-gray-500 font-medium">User ID</p>
              <p className="font-mono text-sm">{data.user.id}</p>
            </div>
            
            {data.user.verified !== undefined && (
              <div>
                <p className="text-gray-500 font-medium">Verified</p>
                <p>{data.user.verified ? 'Yes' : 'No'}</p>
              </div>
            )}
          </div>
        )}

        {data.scope && (
          <div className="mt-4">
            <p className="text-gray-500 font-medium mb-2">Scopes</p>
            <div className="flex flex-wrap gap-2">
              {data.scope.split(' ').map((scope: string, i: number) => (
                <span
                  key={i}
                  className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded"
                >
                  {scope.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {data.expires_in && (
          <div className="mt-4">
            <p className="text-gray-500 font-medium">Token Expires In</p>
            <p>{Math.floor(data.expires_in / 60)} minutes</p>
          </div>
        )}
      </div>
    </div>
  );
}

function renderTodoistData(data: any) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">Todoist Account Information</h3>
      <div className="bg-gray-50 p-4 rounded-md">
        {data.user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 font-medium">Name</p>
              <p>{data.user.name}</p>
            </div>
            
            <div>
              <p className="text-gray-500 font-medium">Email</p>
              <p>{data.user.email}</p>
            </div>
            
            <div>
              <p className="text-gray-500 font-medium">User ID</p>
              <p className="font-mono text-sm">{data.user.id}</p>
            </div>
            
            {data.user.premium !== undefined && (
              <div>
                <p className="text-gray-500 font-medium">Premium Status</p>
                <p>{data.user.premium ? 'Premium' : 'Free'}</p>
              </div>
            )}
          </div>
        )}

        {data.scope && (
          <div className="mt-4">
            <p className="text-gray-500 font-medium mb-2">Scopes</p>
            <div className="flex flex-wrap gap-2">
              {data.scope.split(',').map((scope: string, i: number) => (
                <span
                  key={i}
                  className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded"
                >
                  {scope.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {data.expires_in && (
          <div className="mt-4">
            <p className="text-gray-500 font-medium">Token Expires In</p>
            <p>{Math.floor(data.expires_in / 60)} minutes</p>
          </div>
        )}
      </div>
    </div>
  );
}