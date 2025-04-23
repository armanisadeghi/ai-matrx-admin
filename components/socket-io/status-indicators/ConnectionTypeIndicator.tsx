'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { Server, Laptop } from 'lucide-react';
import { selectSocketUrl } from '@/lib/redux/socket-io/selectors';
import { StatusIndicator } from '@/components/socket-io/status-indicators/StatusIndicator';

const ConnectionTypeIndicator: React.FC = () => {
  const url = useSelector(selectSocketUrl);
  const isLocal = url?.includes('localhost') || url?.includes('127.0.0.1');
  
  return (
    <StatusIndicator
      isActive={true}
      label={isLocal ? 'Local' : 'Server'}
      icon={{
        active: isLocal ? <Laptop className="h-4 w-4 text-green-500" /> : <Server className="h-4 w-4 text-blue-500" />,
        inactive: isLocal ? <Laptop className="h-4 w-4 text-gray-400" /> : <Server className="h-4 w-4 text-gray-400" />,
      }}
    />
  );
};

export default ConnectionTypeIndicator; 