// Original wrapped layout
export { LayoutWithSidebar, SidebarLayout } from './MatrxLayout';

// New direct layout (no wrapper)
export { MatrxLayoutDirect } from './MatrxLayoutDirect';

// Logo components
export { Logo, LogoIcon } from './MatrixLogo';

// Other layout components
export { CollapseToggleButton } from './CollapseToggleButton';

/**
 * Admin Status - Single Source of Truth
 *
 * Admin status is determined from the database 'admins' table.
 *
 * ✅ Recommended Usage:
 *
 * For client components (UI decisions):
 *   import { useUser } from '@/lib/hooks/useUser';
 *   const { isAdmin } = useUser(); // From Redux, set during layout initialization
 *
 * For server-side API routes and server actions:
 *   import { requireAdmin } from '@/utils/auth/adminUtils';
 *   await requireAdmin(); // Throws if not admin, queries database
 *
 * For server-side layouts (when you need both admin + preferences):
 *   import { getUserSessionData } from '@/utils/supabase/userSessionData';
 *   const { isAdmin, preferences } = await getUserSessionData(supabase, userId);
 *
 * ❌ Do NOT use:
 *   - Hard-coded config files
 *   - Client-side admin checks for security decisions
 *   - Multiple sources of truth
 */
