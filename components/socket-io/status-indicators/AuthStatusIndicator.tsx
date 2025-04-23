'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { Shield, ShieldOff } from 'lucide-react';
import { selectIsAuthenticated } from '@/lib/redux/socket-io/selectors';
import { StatusIndicator } from '@/components/socket-io/status-indicators/StatusIndicator';

const AuthStatusIndicator: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  
  return (
    <StatusIndicator
      isActive={isAuthenticated}
      label="Authenticated"
      icon={{
        active: <Shield className="h-4 w-4 text-green-500" />,
        inactive: <ShieldOff className="h-4 w-4 text-red-500" />,
      }}
    />
  );
};

export default AuthStatusIndicator; 