'use client'
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/lib/redux/store';
import { selectNamespace, changeNamespace } from '@/lib/redux/socket-io';
import { AVAILABLE_NAMESPACES } from '@/constants/socket-schema';

const NamespaceSelect: React.FC<{ connectionId: string }> = ({ connectionId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const namespace = useSelector(selectNamespace);
  
  const handleNamespaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(changeNamespace({ connectionId, namespace: e.target.value }));
  };

  return (
    <>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Namespace:
        </label>
        <select
          value={namespace}
          onChange={handleNamespaceChange}
          className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
        >
          {Object.entries(AVAILABLE_NAMESPACES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};

export default NamespaceSelect; 