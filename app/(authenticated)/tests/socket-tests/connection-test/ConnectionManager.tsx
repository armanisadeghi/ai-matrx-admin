'use client';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/lib/redux/store';
import {
  addConnection,
  disconnectConnection,
  setPrimaryConnection,
  selectAllConnections,
  selectIsAdmin,
  selectPrimaryConnectionId,
} from '@/lib/redux/socket-io/slices/socketConnectionsSlice';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const ConnectionManager: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const connections = useSelector(selectAllConnections);
  const isAdmin = useSelector(selectIsAdmin);
  const primaryConnectionId = useSelector(selectPrimaryConnectionId);

  const [url, setUrl] = useState('');
  const [namespace, setNamespace] = useState('/UserSession');
  const [selectedPredefined, setSelectedPredefined] = useState('');

  const predefinedUrls = [
    { name: 'Production', url: 'https://server.app.matrxserver.com', namespace: '/UserSession' },
    { name: 'GPU Server', url: 'https://gpu.app.matrxserver.com', namespace: '/UserSession' },
    { name: 'Localhost', url: 'http://localhost:8000', namespace: '/UserSession' },
  ];

  const handleAddConnection = () => {
    if (url && namespace) {
      const id = crypto.randomUUID();
      dispatch(addConnection({ id, url, namespace }));
      setUrl('');
      setNamespace('/UserSession');
      setSelectedPredefined('custom');
    }
  };

  const handlePredefinedChange = (value: string) => {
    const selected = predefinedUrls.find(opt => opt.name === value);
    if (selected) {
      setSelectedPredefined(value);
      setUrl(selected.url);
      setNamespace(selected.namespace);
    } else {
      setSelectedPredefined(value);
      setUrl('');
      setNamespace('/UserSession');
    }
  };

  const handleDisconnect = (connectionId: string) => {
    dispatch(disconnectConnection(connectionId));
  };

  const handleSetPrimary = (connectionId: string) => {
    dispatch(setPrimaryConnection(connectionId));
  };

  return (
    <div className="p-6 bg-zinc-100 dark:bg-zinc-850 text-gray-800 dark:text-gray-100">
      <h2 className="text-2xl font-bold mb-4">Connection Manager</h2>
      <div className="space-y-4">
        {/* Add New Connection */}
        <div className="space-y-2">
          <Label htmlFor="predefined-select">Predefined Connection</Label>
          <Select value={selectedPredefined} onValueChange={handlePredefinedChange}>
            <SelectTrigger id="predefined-select">
              <SelectValue placeholder="Select a predefined connection..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom</SelectItem>
              {predefinedUrls.map(opt => (
                <SelectItem key={opt.name} value={opt.name}>
                  {opt.name} ({opt.url}{opt.namespace})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label htmlFor="url-input">URL</Label>
          <Input
            id="url-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL (e.g., https://server.app.matrxserver.com)"
          />

          <Label htmlFor="namespace-input">Namespace</Label>
          <Input
            id="namespace-input"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            placeholder="Enter namespace (e.g., /UserSession)"
          />

          <Button onClick={handleAddConnection} disabled={!url || !namespace}>
            Add Connection
          </Button>
        </div>

        {/* Connection List */}
        <div>
          <h3 className="text-lg font-medium mb-2">Active Connections</h3>
          {connections.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No connections</p>
          ) : (
            <ul className="space-y-2">
              {connections.map(conn => (
                <li key={conn.id} className="flex items-center space-x-4 p-2 border rounded-md">
                  <span className="flex-1">
                    {conn.id} ({conn.url}{conn.namespace}) - {conn.connectionStatus}
                    {conn.id === primaryConnectionId && ' (Primary)'}
                  </span>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(conn.id)}
                      disabled={conn.id === primaryConnectionId}
                    >
                      Set Primary
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect(conn.id)}
                    disabled={conn.id === primaryConnectionId}
                  >
                    Disconnect
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionManager;