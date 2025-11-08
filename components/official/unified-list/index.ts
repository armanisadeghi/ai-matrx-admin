/**
 * Unified List Layout System
 * 
 * A comprehensive, reusable layout system for list/grid pages.
 * 
 * @example
 * ```tsx
 * import { UnifiedListLayout } from '@/components/official/unified-list';
 * 
 * <UnifiedListLayout
 *   config={myConfig}
 *   items={items}
 *   renderCard={(item, actions) => <MyCard item={item} {...actions} />}
 * />
 * ```
 */

export { UnifiedListLayout } from './UnifiedListLayout';
export { UnifiedActionBar } from './UnifiedActionBar';
export { UnifiedFilterModal } from './UnifiedFilterModal';

export * from './types';
export * from './utils';

