import React from 'react';

export default function TasksLoading() {
  return (
    <div className="flex w-full h-full">
      {/* Sidebar placeholder */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-border p-4 flex flex-col animate-pulse">
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        
        {/* Toggle buttons */}
        <div className="flex gap-2 mb-3">
          <div className="h-9 flex-1 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-9 flex-1 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        
        {/* Add project form */}
        <div className="mb-3 space-y-2">
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="flex gap-2">
            <div className="h-10 flex-1 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
        
        {/* Project list skeleton */}
        <div className="space-y-2 flex-1">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-10 bg-gray-100 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>

      {/* Main content loading */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header placeholder */}
        <div className="border-b border-border p-4 bg-white dark:bg-gray-800 animate-pulse">
          <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>

        {/* Content area with skeleton tasks */}
        <main className="flex-1 overflow-y-auto p-4 bg-textured">
          <div className="mx-auto max-w-4xl space-y-3 animate-pulse">
            {/* Add task form skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border-border p-3">
              <div className="space-y-2">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex gap-2">
                  <div className="h-9 flex-1 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            </div>
            
            {/* Skeleton task items */}
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

