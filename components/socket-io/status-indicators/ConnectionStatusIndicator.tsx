'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { Wifi, WifiOff } from 'lucide-react';
import { selectIsConnected } from '@/lib/redux/socket-io/selectors';
import { StatusIndicator } from '@/components/socket-io/status-indicators/StatusIndicator';

interface ConnectionStatusIndicatorProps {
  compact?: boolean;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ compact = false }) => {
  const isConnected = useSelector(selectIsConnected);
  
  return (
    <StatusIndicator
      isActive={isConnected}
      label="Connected"
      icon={{
        active: <Wifi className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} text-green-500`} />,
        inactive: <WifiOff className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} text-red-500`} />,
      }}
      compact={compact}
    />
  );
};

export default ConnectionStatusIndicator; 