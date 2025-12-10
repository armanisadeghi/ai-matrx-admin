/**
 * Mobile Action Bar Component System
 * 
 * Reusable mobile search, filter, and action components
 * for consistent UX across the entire application.
 * 
 * @example Basic usage
 * ```tsx
 * import { MobileActionBar, MobileFilterDrawer } from '@/components/official/mobile-action-bar';
 * 
 * function MyFeature() {
 *   const [searchTerm, setSearchTerm] = useState("");
 *   const [isFilterOpen, setIsFilterOpen] = useState(false);
 *   const [filters, setFilters] = useState({});
 *   
 *   return (
 *     <>
 *       <MobileActionBar
 *         searchValue={searchTerm}
 *         onSearchChange={setSearchTerm}
 *         totalCount={items.length}
 *         filteredCount={filteredItems.length}
 *         onPrimaryAction={() => createNew()}
 *         primaryActionLabel="New Item"
 *         isFilterModalOpen={isFilterOpen}
 *         setIsFilterModalOpen={setIsFilterOpen}
 *       />
 *       
 *       <MobileFilterDrawer
 *         isOpen={isFilterOpen}
 *         onClose={() => setIsFilterOpen(false)}
 *         filterConfig={myFilterConfig}
 *         activeFilters={filters}
 *         onFiltersChange={setFilters}
 *         totalCount={items.length}
 *         filteredCount={filteredItems.length}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

export { MobileActionBar } from "./MobileActionBar";
export { MobileFilterDrawer } from "./MobileFilterDrawer";
export type {
    MobileActionBarProps,
    MobileFilterDrawerProps,
    FilterConfig,
    FilterField,
    FilterOption,
    FilterState,
} from "./types";

