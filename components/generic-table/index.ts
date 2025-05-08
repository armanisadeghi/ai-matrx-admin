import GenericDataTable, { type ColumnConfig, type ActionConfig, type CustomTableSettings } from './GenericDataTable';
import GenericTablePagination from './GenericTablePagination';
import GenericTableHeader from './GenericTableHeader';

// Export all components individually
export { GenericDataTable, GenericTablePagination, GenericTableHeader };

// Export types
export type { ColumnConfig, ActionConfig, CustomTableSettings };

// Export the main component as default
export default GenericDataTable;
