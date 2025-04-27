import React from 'react';

export const metadata = {
  title: 'SQL Functions',
  description: 'Manage database SQL functions',
};

export default function SQLFunctionsPage() {
  return (
    <div className="w-full h-full min-h-screen bg-slate-100 dark:bg-slate-800 py-6 px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-200 mb-2">
          SQL Functions
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Browse, search, and manage SQL functions in the database
        </p>
      </div>

      <div className="w-full h-full">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
            SQL Functions Management
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            SQL Functions component will be implemented here with filtering, sorting, and search capabilities.
          </p>
        </div>
      </div>
    </div>
  );
} 