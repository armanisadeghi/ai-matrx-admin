import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Hook to inject route-specific content into the app sidebar
 * 
 * Usage:
 * ```tsx
 * const SidebarContent = useSidebarContent(() => (
 *   <div>Your sidebar content here</div>
 * ));
 * 
 * return (
 *   <>
 *     {SidebarContent}
 *     <main>Your page content</main>
 *   </>
 * );
 * ```
 */
export function useSidebarContent(content: () => React.ReactNode) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Only run on client side
    const sidebarContainer = document.getElementById('page-specific-sidebar-content');
    if (!sidebarContainer) {
      console.warn('Sidebar content container not found. Content injection will not work.');
    }
    setContainer(sidebarContainer);
  }, []);

  // Don't render anything during SSR or if container doesn't exist
  if (!container) {
    return null;
  }

  return createPortal(content(), container);
}

