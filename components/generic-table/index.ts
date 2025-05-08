import GenericDataTable, { type ColumnConfig, type ActionConfig } from './GenericDataTable';
import GenericTablePagination from './GenericTablePagination';
import GenericTableHeader from './GenericTableHeader';

// Export all components individually
export { GenericDataTable, GenericTablePagination, GenericTableHeader };

// Export types
export type { ColumnConfig, ActionConfig };

// Export the main component as default
export default GenericDataTable;
