'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useAppSelector } from '@/lib/redux';
import { selectAllConnections, selectPrimaryConnectionId } from '@/lib/redux/socket-io';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface ActiveConnectionSelectorProps {
  onConnectionSelect: (connectionId: string) => void;
  selectedConnectionId?: string;
  className?: string;
  compact?: boolean;
}

const ActiveConnectionSelector: React.FC<ActiveConnectionSelectorProps> = ({
  onConnectionSelect,
  selectedConnectionId,
  className = '',
  compact = false
}) => {
  const connections = useAppSelector(selectAllConnections);
  const primaryConnectionId = useAppSelector(selectPrimaryConnectionId);
  const [showIndicators, setShowIndicators] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  const currentConnectionId = selectedConnectionId || primaryConnectionId;

  // Find the currently selected connection
  const selectedConnection = connections.find(conn => conn.connectionId === currentConnectionId);

  const handleChange = (value: string) => {
    onConnectionSelect(value);
  };

  // Format namespace to remove leading slash
  const formatNamespace = (namespace: string) => {
    return namespace.startsWith('/') ? namespace.substring(1) : namespace;
  };

  // Check if there's enough space to show indicators
  useEffect(() => {
    const checkWidth = () => {
      if (triggerRef.current) {
        const width = triggerRef.current.offsetWidth;
        setShowIndicators(width > 300);
      }
    };

    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  if (connections.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm border border-border">
        No active connections
      </div>
    );
  }

  const isPrimary = selectedConnection?.connectionId === primaryConnectionId;
  const isConnected = selectedConnection?.connectionStatus === 'connected';

  return (
    <Select value={currentConnectionId} onValueChange={handleChange}>
      <SelectTrigger 
        ref={triggerRef}
        className={`
          bg-gray-200 dark:bg-gray-900 border border-gray-400 dark:border-gray-600 
          ${compact ? 'h-8 text-xs rounded-xl' : 'rounded-3xl'} 
          ${className}
        `}
      >
        <SelectValue placeholder="Select connection">
          {selectedConnection && (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2 flex-1 overflow-hidden">
                <span className="truncate">{selectedConnection.url.replace(/^https?:\/\//, '')}</span>
                {!compact && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 whitespace-nowrap flex-shrink-0">
                    {formatNamespace(selectedConnection.namespace)}
                  </span>
                )}
              </div>
              
              {showIndicators && !compact && (
                <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                  {isConnected && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 whitespace-nowrap">
                      Connected
                    </span>
                  )}
                  {isPrimary && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 whitespace-nowrap">
                      Primary
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {connections.map((connection) => (
          <SelectItem
            key={connection.connectionId}
            value={connection.connectionId}
            className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
          >
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-semibold">{connection.url.replace(/^https?:\/\//, '')}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">
                  {formatNamespace(connection.namespace)}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${connection.connectionStatus === 'connected' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'}`}>
                  {connection.connectionStatus}
                </span>
                {connection.connectionId === primaryConnectionId && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                    Primary
                  </span>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default ActiveConnectionSelector; 