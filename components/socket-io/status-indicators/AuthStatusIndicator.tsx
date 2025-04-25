'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { Shield, ShieldOff } from 'lucide-react';
import { selectIsAuthenticated } from '@/lib/redux/socket-io/selectors';
import { StatusIndicator } from '@/components/socket-io/status-indicators/StatusIndicator';

interface AuthStatusIndicatorProps {
  compact?: boolean;
}

const AuthStatusIndicator: React.FC<AuthStatusIndicatorProps> = ({ compact = false }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  return (
    <StatusIndicator
      isActive={isAuthenticated}
      label="Authenticated"
      icon={{
        active: <Shield className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} text-green-500`} />,
        inactive: <ShieldOff className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} text-red-500`} />,
      }}
      compact={compact}
    />
  );
};

export default AuthStatusIndicator; 