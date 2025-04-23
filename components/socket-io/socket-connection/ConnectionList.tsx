'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import ConnectionItem from './ConnectionItem';
import { selectAllConnections } from '@/lib/redux/socket-io/selectors';

const ConnectionList: React.FC = () => {
  const connections = useAppSelector(selectAllConnections);

  if (connections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {connections.map(connection => (
        <ConnectionItem key={connection.connectionId} connection={connection} />
      ))}
    </div>
  );
};

export default ConnectionList; 