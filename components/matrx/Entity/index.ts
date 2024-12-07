// components/matrx/Entity/index.ts

// Import directly used components and configurations
import SmartEntityContent from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/NotSmartEntityContent";
import EntitySelection from "@/components/matrx/Entity/prewired-components/entity-management/EntitySelection";
import { densityConfig } from "@/config/ui/entity-layout-config";
import { EnhancedCard } from "@/components/matrx/Entity/prewired-components/layouts/parts/EnhancedCard";
import { LayoutHeader } from "@/components/matrx/Entity/prewired-components/layouts/layout-sections/extras";

// General exports
export { default as EntityBrowser } from './EntityBrowser';
export { default as EntityCardHeader } from './EntityCardHeaderSelect';
export { default as EntityDirectory } from './EntityDirectory';
export { default as EntityTableContainer } from './EntityTableContainer';

// Actions
export * from './action/MatrixTableActions';

// Form-related exports
export { default as FlexEntityForm } from './form/FlexEntityForm';
export { default as EntityForm } from './form/EntityForm';

// Modal components
export { default as EntityFormModal } from './modal/EntityFormModal';
export { default as EntityTabModal } from './modal/EntityTabModal';

// Table components
export { default as MatrxColumnSettings } from './table/MatrxColumnSettings';
export { default as MatrxTable } from './table/MatrxTable';
export { default as MatrxTableBody } from './table/MatrxTableBody';
export { default as MatrxTableCell } from './table/MatrxTableCell';
export { default as MatrxTableHeader } from './table/MatrxTableHeader';

// Add-ons
export { default as MatrixTableTooltip } from './addOns/MatrixTableTooltip';
export { default as TableTopOptions } from './addOns/TableTopOptions';
export { default as TableBottomSection } from './addOns/TableBottomSection';

// Prewired components
export { default as EntityShowSelectedAccordion } from './prewired-components/EntityShowSelectedAccordion';

// Utilities
export * from './utils/tableHelpers';

// Types
export * from './types/advancedDataTableTypes';
export * from './prewired-components/layouts/types';

// Miscellaneous exports
export { SmartEntityContent, EntitySelection, densityConfig, EnhancedCard, LayoutHeader };
