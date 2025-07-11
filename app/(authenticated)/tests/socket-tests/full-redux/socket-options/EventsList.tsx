'use client'
import React from 'react';
import { useSelector } from 'react-redux';
import { selectAllResponses } from '@/lib/redux/socket-io';

const EventsList: React.FC = () => {
  const responses = useSelector(selectAllResponses);
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Active Events</h3>
      <div className="space-y-2">
        {Object.keys(responses).length > 0 ? (
          Object.keys(responses).map((eventName) => (
            <div 
              key={eventName}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-zinc-800"
            >
              <div className="flex items-center justify-between">
                <p className="text-gray-700 dark:text-gray-300 text-sm overflow-hidden text-ellipsis">
                  {eventName}
                </p>
                {responses[eventName].ended ? (
                  <span className="text-green-600 dark:text-green-400 ml-1 flex-shrink-0">✓</span>
                ) : (
                  <span className="text-blue-600 dark:text-blue-400 ml-1 flex-shrink-0">⟳</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No active events</p>
        )}
      </div>
    </div>
  );
};

export default EventsList; 