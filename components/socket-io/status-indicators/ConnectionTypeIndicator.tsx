'use client';

import React from 'react';
import { Server } from 'lucide-react';
import { selectPrimaryConnection } from '@/lib/redux/socket-io';
import { StatusIndicator } from '@/components/socket-io/status-indicators/StatusIndicator';
import { useAppSelector } from '@/lib/redux';

interface ConnectionTypeIndicatorProps {
  compact?: boolean;
}

const ConnectionTypeIndicator: React.FC<ConnectionTypeIndicatorProps> = ({ compact = false }) => {
  const connection = useAppSelector(selectPrimaryConnection);
  const isLocal = connection?.url?.includes('localhost') || false;
  
  return (
    <StatusIndicator
      isActive={!isLocal}
      label={isLocal ? "Local" : "Remote"}
      icon={{
        active: <Server className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} text-blue-500`} />,
        inactive: <Server className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} text-orange-500`} />,
      }}
      compact={compact}
    />
  );
};

export default ConnectionTypeIndicator; 