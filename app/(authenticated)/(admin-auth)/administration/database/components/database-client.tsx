"use client";

import { useDatabaseAdmin } from "@/app/(authenticated)/admin/hooks/use-database-admin";
import { EnhancedSQLEditor } from "./enhanced-sql-editor";

export default function DatabaseClient() {
  const {
    loading,
    error,
    isTimeout,
    executeQuery,
    cancelQuery,
    clearCache,
    queryCache,
  } = useDatabaseAdmin();

  return (
    <EnhancedSQLEditor
      className="flex-1 min-h-0"
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
