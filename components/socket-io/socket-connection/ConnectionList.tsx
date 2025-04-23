'use client';
import React from 'react';
import { useSelector } from 'react-redux';
import { selectAllConnections } from '@/lib/redux/socket-io/slices/socketConnectionsSlice';
import ConnectionItem from './ConnectionItem';

const ConnectionList: React.FC = () => {
  const connections = useSelector(selectAllConnections);

  if (connections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      {connections.map(connection => (
        <ConnectionItem key={connection.id} connection={connection} />
      ))}
    </div>
  );
};

export default ConnectionList; 