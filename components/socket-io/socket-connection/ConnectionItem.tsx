'use client';
import React from 'react';
import {
  disconnectConnection,
  reconnectConnection,
  deleteConnection,
  setPrimaryConnection,
} from '@/lib/redux/socket-io/slices/socketConnectionsSlice';
import { SocketConnection } from '@/lib/redux/socket-io/socket.types';

import { Badge } from '@/components/ui/badge';
import { IconButton } from '@/components/ui/icon-button';
import { Trash2, Plug, PlugZap, Star } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { selectIsAdmin, selectPrimaryConnectionId } from '@/lib/redux/socket-io/selectors';
interface ConnectionItemProps {
  connection: SocketConnection;
}

const ConnectionItem: React.FC<ConnectionItemProps> = ({ connection }) => {
  const dispatch = useAppDispatch();
  const isAdmin = useAppSelector(selectIsAdmin);
  const primaryConnectionId = useAppSelector(selectPrimaryConnectionId);
  const isPrimaryConnection = connection.connectionId === primaryConnectionId;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500 dark:bg-green-700';
      case 'connecting':
        return 'bg-yellow-500 dark:bg-yellow-700';
      case 'error':
        return 'bg-red-500 dark:bg-red-700';
      default:
        return 'bg-gray-500 dark:bg-gray-700';
    }
  };

  const handleDisconnect = () => {
    dispatch(disconnectConnection(connection.connectionId));
  };

  const handleReconnect = () => {
    dispatch(reconnectConnection(connection.connectionId));
  };

  const handleDelete = () => {
    if (connection.connectionId !== primaryConnectionId) {
      dispatch(deleteConnection(connection.connectionId));
    }
  };

  const handleSetPrimary = () => {
    dispatch(setPrimaryConnection(connection.connectionId));
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-3xl border border-zinc-300 dark:border-zinc-700 text-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{connection.url}</span>
          <Badge variant="outline" className={`${getStatusColor(connection.connectionStatus)} text-white text-xs py-0 h-5 rounded-3xl`}>
            {connection.connectionStatus}
          </Badge>
          {isPrimaryConnection && (
            <Badge className="bg-blue-500 dark:bg-blue-700 text-xs py-0 h-5 rounded-3xl">
              Primary
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isAdmin && !isPrimaryConnection && (
          <IconButton
            variant="ghost"
            size="default"
            tooltip="Set as primary connection"
            icon={<Star className="h-5 w-5 text-yellow-500" />}
            onClick={handleSetPrimary}
            className="text-yellow-500"
            showTooltipOnDisabled={true}
          />
        )}
        
        {connection.connectionStatus === 'connected' ? (
          <IconButton
            variant="ghost"
            size="default"
            tooltip="Disconnect"
            disabledTooltip="Cannot disconnect primary connection"
            icon={<PlugZap className="h-5 w-5" />}
            onClick={handleDisconnect}
            disabled={isPrimaryConnection}
            showTooltipOnDisabled={true}
            className="text-red-500"
          />
        ) : (
          <IconButton
            variant="ghost"
            size="default"
            tooltip="Reconnect"
            disabledTooltip="Connection is in progress..."
            icon={<Plug className="h-5 w-5" />}
            onClick={handleReconnect}
            disabled={connection.connectionStatus === 'connecting'}
            showTooltipOnDisabled={true}
            className="text-green-500"
          />
        )}
        
        {!isPrimaryConnection && (
          <IconButton
            variant="ghost"
            size="default"
            tooltip="Delete connection"
            icon={<Trash2 className="h-5 w-5" />}
            onClick={handleDelete}
            className="text-red-500"
            showTooltipOnDisabled={true}
          />
        )}
      </div>
    </div>
  );
};

export default ConnectionItem; 