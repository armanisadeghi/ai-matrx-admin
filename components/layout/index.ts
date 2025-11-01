// Original wrapped layout
export { LayoutWithSidebar, SidebarLayout } from './MatrxLayout';

// New direct layout (no wrapper)
export { MatrxLayoutDirect } from './MatrxLayoutDirect';

// Logo components
export { Logo, LogoIcon } from './MatrixLogo';

// Other layout components
export { CollapseToggleButton } from './CollapseToggleButton';

/**
 * Admin IDs have been moved to a centralized config
 * 
 * ❌ Don't import from here
 * ✅ Use instead:
 * 
 * For client components:
 *   import { useUser } from '@/lib/hooks/useUser';
 *   const { isAdmin } = useUser();
 * 
 * For server components/utilities:
 *   import { isAdminUser } from '@/config/admin.config';
 *   const isAdmin = isAdminUser(userId);
 * 
 * For server actions:
 *   import { requireAdmin } from '@/utils/auth/adminUtils';
 *   await requireAdmin(); // Throws if not admin
 */
