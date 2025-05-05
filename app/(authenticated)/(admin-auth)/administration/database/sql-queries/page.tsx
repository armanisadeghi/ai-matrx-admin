import React from 'react';
import DatabaseClient from '../components/database-client';

export const metadata = {
  title: 'SQL Query Editor',
  description: 'Execute SQL queries against the database',
};

export default function SQLQueriesPage() {
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-800 py-6 px-6">
      <div className="w-full">
        <DatabaseClient />
      </div>
    </div>
  );
}
