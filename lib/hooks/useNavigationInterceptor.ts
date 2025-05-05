"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

interface UseNavigationInterceptorProps {
  shouldIntercept: boolean;
  currentPath: string;
}

export function useNavigationInterceptor({ shouldIntercept, currentPath }: UseNavigationInterceptorProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const hasInterceptedRef = useRef(false);
  const userActionTakenRef = useRef(false);
  
  // Function to handle internal navigation
  const handleNavigation = useCallback((href: string) => {
    if (shouldIntercept && !href.startsWith(currentPath)) {
      setPendingNavigation(href);
      setShowDialog(true);
      hasInterceptedRef.current = true;
      userActionTakenRef.current = false;
      return false; // Prevent immediate navigation
    }
    
    return true; // Allow navigation
  }, [shouldIntercept, currentPath]);
  
  // Continue navigation after confirmation
  const continuePendingNavigation = useCallback(() => {
    userActionTakenRef.current = true;
    if (pendingNavigation) {
      hasInterceptedRef.current = false;
      setShowDialog(false);
      router.push(pendingNavigation);
      setPendingNavigation(null);
    } else {
      setShowDialog(false);
    }
  }, [pendingNavigation, router]);
  
  // Cancel navigation
  const cancelNavigation = useCallback(() => {
    userActionTakenRef.current = true;
    hasInterceptedRef.current = false;
    setPendingNavigation(null);
    setShowDialog(false);
    
    // If this was triggered by a popstate event and we're not in the app builder path,
    // we should navigate back to the app builder
    if (pathname && !pathname.startsWith(currentPath)) {
      router.push(currentPath);
    }
  }, [pathname, currentPath, router]);
  
  // Intercept click events on links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Check if it's a link click
      const link = (e.target as HTMLElement).closest('a');
      if (!link) return;
      
      // Don't interfere with external links, target="_blank", downloads, etc.
      const href = link.getAttribute('href');
      if (
        !href || 
        href.startsWith('http') || 
        href.startsWith('mailto:') || 
        href.startsWith('tel:') || 
        link.getAttribute('target') === '_blank' || 
        link.getAttribute('download') !== null
      ) {
        return;
      }
      
      // Handle navigation interception
      if (shouldIntercept && !href.startsWith(currentPath)) {
        e.preventDefault();
        setPendingNavigation(href);
        setShowDialog(true);
        hasInterceptedRef.current = true;
        userActionTakenRef.current = false;
      }
    };
    
    // Add global click listener
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [shouldIntercept, currentPath]);
  
  // Handle Next.js router events
  useEffect(() => {
    // This helps handle programmatic navigation from other components
    if (shouldIntercept && pathname && !pathname.startsWith(currentPath) && !hasInterceptedRef.current) {
      hasInterceptedRef.current = true;
      userActionTakenRef.current = false;
      setShowDialog(true);
      return;
    }
  }, [pathname, shouldIntercept, currentPath]);
  
  // Listen for browser navigation events (back/forward)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (shouldIntercept) {
        // Can't stop browser back/forward navigation in a clean way,
        // but we can prompt the user after the fact and navigate back if they cancel
        const currentHref = window.location.pathname;
        
        if (!currentHref.startsWith(currentPath)) {
          // Show dialog, allow user to go back to their work
          setShowDialog(true);
          hasInterceptedRef.current = true;
          userActionTakenRef.current = false;
        }
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [shouldIntercept, currentPath]);
  
  // Close dialog function
  const closeDialog = useCallback(() => {
    // Allow closing when it's an intentional action or through one of the buttons
    userActionTakenRef.current = true;
    setShowDialog(false);
  }, []);
  
  return {
    showDialog,
    pendingUrl: pendingNavigation,
    handleNavigation,
    confirmNavigation: continuePendingNavigation,
    cancelNavigation,
    closeDialog
  };
} 