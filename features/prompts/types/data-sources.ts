/**
 * Data Source Types for Prompt Execution
 * 
 * Defines types for referencing user-generated table data
 */

export type TableBookmarkType = 'full_table' | 'table_row' | 'table_column' | 'table_cell';

export interface TableBookmarkBase {
  table_id: string;
  table_name: string;
  description: string;
}

export interface FullTableBookmark extends TableBookmarkBase {
  type: 'full_table';
}

export interface TableRowBookmark extends TableBookmarkBase {
  type: 'table_row';
  row_id: string;
}

export interface TableColumnBookmark extends TableBookmarkBase {
  type: 'table_column';
  column_name: string;
  column_display_name: string;
}

export interface TableCellBookmark extends TableBookmarkBase {
  type: 'table_cell';
  row_id: string;
  column_name: string;
  column_display_name: string;
}

export type TableBookmark = 
  | FullTableBookmark 
  | TableRowBookmark 
  | TableColumnBookmark 
  | TableCellBookmark;

/**
 * Extended variable source that supports table bookmarks
 */
export type VariableDataSource = 
  | { type: 'text'; value: string }
  | { type: 'table-bookmark'; bookmark: TableBookmark; data?: string }
  | { type: 'file'; fileId: string; content?: string }
  | { type: 'url'; url: string; content?: string };

