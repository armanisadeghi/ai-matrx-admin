import React from 'react';
import DatabaseClient from './components/database-client';

export const metadata = {
  title: 'Database Admin',
  description: 'Database administration tools',
};

export default function DatabaseAdminPage() {
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-800 py-6 px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-200 mb-2">
          Database Administration
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Execute SQL queries and manage database objects
        </p>
      </div>

      <div className="w-full">
        <DatabaseClient />
      </div>
    </div>
  );
}
