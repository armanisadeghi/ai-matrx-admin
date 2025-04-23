'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { Wifi, WifiOff } from 'lucide-react';
import { selectIsConnected } from '@/lib/redux/socket-io/selectors';
import { StatusIndicator } from '@/components/socket-io/status-indicators/StatusIndicator';

const ConnectionStatusIndicator: React.FC = () => {
  const isConnected = useSelector(selectIsConnected);
  
  return (
    <StatusIndicator
      isActive={isConnected}
      label="Connected"
      icon={{
        active: <Wifi className="h-4 w-4 text-green-500" />,
        inactive: <WifiOff className="h-4 w-4 text-red-500" />,
      }}
    />
  );
};

export default ConnectionStatusIndicator; 