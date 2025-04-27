'use client';

import React from 'react';
import { useDatabaseAdmin } from '@/app/(authenticated)/admin/hooks/use-database-admin';
import { EnhancedSQLEditor } from './enhanced-sql-editor';

export default function DatabaseClient() {
  const { 
    loading, 
    error, 
    isTimeout,
    executeQuery, 
    cancelQuery, 
    clearCache,
    queryCache 
  } = useDatabaseAdmin();

  return (
    <EnhancedSQLEditor 
      loading={loading}
      error={error}
      isTimeout={isTimeout}
      onExecuteQuery={executeQuery}
      onCancelQuery={cancelQuery}
      onClearCache={clearCache}
      queryCache={queryCache}
    />
  );
} 