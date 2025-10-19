import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Key, Lock, Shield, WifiOff, Wifi, AlertCircle } from 'lucide-react';

function AuthenticationNode({ data, isConnectable }) {
  const authType = data.authType || 'api_key'; // 'api_key', 'oauth', 'jwt', 'basic'
  const connected = data.connected !== undefined ? data.connected : false;
  
  // Select icon based on auth type
  const getAuthIcon = () => {
    switch (authType) {
      case 'oauth': return <Shield className="h-6 w-6 text-gray-700 dark:text-gray-300" />;
      case 'jwt': return <Lock className="h-6 w-6 text-gray-700 dark:text-gray-300" />;
      case 'basic': return <Key className="h-6 w-6 text-gray-700 dark:text-gray-300" />;
      default: return <Key className="h-6 w-6 text-gray-700 dark:text-gray-300" />;
    }
  };
  
  return (
    <div className="border border-gray-300 rounded-lg bg-textured shadow-md w-52">
      <div className="absolute -left-3 top-1/2 transform -translate-y-1/2">
        <div className="flex items-center justify-center w-6 h-6 bg-purple-300 dark:bg-gray-700 rounded-md">
          <Lock className="h-4 w-4 text-purple-600 dark:text-gray-300" />
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center">
          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg mr-3">
            {getAuthIcon()}
          </div>
          <div>
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{data.label}</div>
            {data.subLabel && (
              <div className="text-xs text-gray-500 dark:text-gray-400">{data.subLabel}</div>
            )}
          </div>
        </div>
        
        {/* Auth Type Indicator */}
        <div className="mt-2 flex items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">Type:</div>
          <div className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
            {authType === 'api_key' ? 'API Key' : 
             authType === 'oauth' ? 'OAuth' : 
             authType === 'jwt' ? 'JWT' : 'Basic Auth'}
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="mt-2 flex items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">Status:</div>
          {connected ? (
            <div className="flex items-center text-green-500 text-xs">
              <Wifi className="h-3 w-3 mr-1" />
              Connected
            </div>
          ) : (
            <div className="flex items-center text-red-500 text-xs">
              <WifiOff className="h-3 w-3 mr-1" />
              Disconnected
            </div>
          )}
        </div>
        
        {/* Credential Security Warning */}
        {data.securityWarning && (
          <div className="mt-2 flex items-start text-yellow-500 bg-yellow-50 dark:bg-gray-700 p-1.5 rounded text-xs">
            <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0 mt-0.5" />
            <span>{data.securityWarning}</span>
          </div>
        )}
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-gray-400"
      />
    </div>
  );
}

export default memo(AuthenticationNode);