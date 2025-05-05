'use client'
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/lib/redux/store';
import { changeConnectionUrl, selectSocketUrl, selectConnectionStatus } from '@/lib/redux/socket-io';



const SocketServerSelect: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const socketUrl = useSelector(selectSocketUrl);
  const connectionStatus = useSelector(selectConnectionStatus);
  
  const handleSocketUrlChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const url = e.target.value;
    const connectionId = `connection-${url}`;
    dispatch(changeConnectionUrl({ connectionId: connectionId, url: url }));
  };

  return (
    <>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Socket URL (Status: {connectionStatus || 'No connection'})
        </label>
        <select
          value={socketUrl || ''}
          onChange={handleSocketUrlChange}
          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
        >
          <option value="">Select Socket URL</option>
          <option value="https://server.app.matrxserver.com">Production Server</option>
          <option value="http://localhost:8000">Local Server</option>
        </select>
      </div>
    </>
  );
};

export default SocketServerSelect;