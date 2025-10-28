import React from 'react';
import DatabaseClient from '../components/database-client';

export const metadata = {
  title: 'SQL Query Editor',
  description: 'Execute SQL queries against the database',
};

export default function SQLQueriesPage() {
  return (
    <div className="h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="w-full py-6 px-6">
          <DatabaseClient />
        </div>
      </div>
    </div>
  );
}
