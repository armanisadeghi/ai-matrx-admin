import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from "@/lib/utils";
import { Copy, Check, Bookmark, ExternalLink, FileText } from 'lucide-react';

// Error Boundary for Link Component
class LinkErrorBoundary extends React.Component<
    { children: React.ReactNode; href?: string; fallbackChildren?: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('LinkComponent Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // Graceful fallback to a simple link
            const { href, fallbackChildren } = this.props;
            return (
                <a
                    href={href || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline"
                >
                    {fallbackChildren || 'Link'}
                </a>
            );
        }

        return this.props.children;
    }
}

// Global state management for ensuring only one popup is open at a time
let activePopupId: string | null = null;
const popupListeners = new Set<(activeId: string | null) => void>();

const setActivePopup = (id: string | null) => {
    activePopupId = id;
    popupListeners.forEach(listener => listener(id));
};

const useGlobalPopupState = (componentId: string) => {
    const [isActive, setIsActive] = useState(false);
    
    useEffect(() => {
        const listener = (activeId: string | null) => {
            setIsActive(activeId === componentId);
        };
        
        popupListeners.add(listener);
        // Set initial state
        setIsActive(activePopupId === componentId);
        
        return () => {
            popupListeners.delete(listener);
        };
    }, [componentId]);
    
    const openPopup = useCallback(() => setActivePopup(componentId), [componentId]);
    const closePopup = useCallback(() => setActivePopup(null), []);
    
    return { isActive, openPopup, closePopup };
};

const LinkComponentCore = ({ href, children }: { href: string; children: React.ReactNode }) => {
    // Validate props early
    if (!href || typeof href !== 'string') {
        return <span className="text-blue-600 dark:text-blue-400">{children || 'Invalid Link'}</span>;
    }

    // Generate stable component ID using useMemo equivalent
    const componentIdRef = useRef<string | null>(null);
    if (!componentIdRef.current) {
        componentIdRef.current = `link-popup-${Math.random().toString(36).substr(2, 9)}`;
    }
    const componentId = componentIdRef.current as string;
    
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const isMountedRef = useRef(false);
    const linkRef = useRef<HTMLSpanElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const mouseTrackingRef = useRef(false);
    
    // Use global popup state
    const { isActive: isPopupActive, openPopup, closePopup } = useGlobalPopupState(componentId);
    
    // Set isMounted to true on mount (for SSR safety) - STABLE, runs once
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Clean up any active popup on unmount
            if (activePopupId === componentId) {
                setActivePopup(null);
            }
        };
    }, []); // Empty dependency array - runs once
    
    // Handle mouse move - stable callback
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!menuRef.current || !mouseTrackingRef.current) return;
        
        try {
            const menuRect = menuRef.current.getBoundingClientRect();
            
            // Check if mouse is within menu boundaries or close to it
            const isMouseNearMenu = (
                e.clientX >= menuRect.left - 20 && 
                e.clientX <= menuRect.right + 20 && 
                e.clientY >= menuRect.top - 20 && 
                e.clientY <= menuRect.bottom + 20
            );
            
            // Also check if mouse is over the link itself
            const linkRect = linkRef.current?.getBoundingClientRect();
            const isMouseNearLink = linkRect && (
                e.clientX >= linkRect.left - 5 && 
                e.clientX <= linkRect.right + 5 && 
                e.clientY >= linkRect.top - 5 && 
                e.clientY <= linkRect.bottom + 5
            );
            
            // Keep the menu open if mouse is over or near it, or near the link
            if (!isMouseNearMenu && !isMouseNearLink) {
                mouseTrackingRef.current = false;
                setIsHovered(false);
                closePopup();
            }
        } catch (error) {
            console.error('Error in handleMouseMove:', error);
            // Fail gracefully
            mouseTrackingRef.current = false;
            setIsHovered(false);
            closePopup();
        }
    }, [closePopup]);
    
    // Add/remove mouse move listener - FIXED: removed menuRef.current from dependencies
    useEffect(() => {
        if (isPopupActive && isHovered) {
            mouseTrackingRef.current = true;
            document.addEventListener('mousemove', handleMouseMove);
        } else {
            mouseTrackingRef.current = false;
            document.removeEventListener('mousemove', handleMouseMove);
        }
        
        return () => {
            mouseTrackingRef.current = false;
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isPopupActive, isHovered, handleMouseMove]); // Removed menuRef.current and isMounted
    
    // Sync local hover state with global popup state
    useEffect(() => {
        if (!isPopupActive && isHovered) {
            setIsHovered(false);
        }
    }, [isPopupActive, isHovered]);
    
    // Handle mouse enter on the link - stable callback
    const handleMouseEnter = useCallback((e: React.MouseEvent) => {
        try {
            setMenuPosition({ x: e.clientX, y: e.clientY });
            setIsHovered(true);
            openPopup();
        } catch (error) {
            console.error('Error in handleMouseEnter:', error);
        }
    }, [openPopup]);
    
    const handleCopyLink = useCallback(() => {
        if (!navigator.clipboard) {
            console.error('Clipboard API not available');
            return;
        }
        
        navigator.clipboard.writeText(href)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
                console.error('Failed to copy link:', err);
            });
    }, [href]);
    
    const handleOpenInNewTab = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            window.open(href, '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.error('Failed to open link:', error);
        }
    }, [href]);
    
    const handleAddToFavorites = useCallback(() => {
        console.log('Added to favorites:', { url: href, title: children });
        // Could be expanded to save to localStorage or Redux
    }, [href, children]);
    
    const handleGetContent = useCallback(() => {
        console.log('Getting content from:', href);
        // Could be expanded later
    }, [href]);

    // Calculate menu position - stable function
    const getMenuStyle = useCallback(() => {
        if (!menuPosition || !isMountedRef.current) return {};
        
        try {
            const menuWidth = 300;
            const menuHeight = 200;
            
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            let left = menuPosition.x;
            let top = menuPosition.y;
            
            if (left + menuWidth > windowWidth) {
                left = Math.max(10, windowWidth - menuWidth - 10);
            }
            
            if (top + menuHeight > windowHeight) {
                top = Math.max(10, windowHeight - menuHeight - 10);
            }
            
            return {
                position: 'fixed' as const,
                top: `${top}px`,
                left: `${left}px`,
                zIndex: 100
            };
        } catch (error) {
            console.error('Error calculating menu position:', error);
            return {};
        }
    }, [menuPosition]);
    
    // Function to truncate URL if it's too long
    const truncateUrl = useCallback((url: string, maxLength = 40) => {
        if (!url || url.length <= maxLength) return url;
        const start = url.substring(0, maxLength / 2);
        const end = url.substring(url.length - maxLength / 2);
        return `${start}...${end}`;
    }, []);
    
    // Get display text for children
    const displayText = typeof children === 'string' ? children : 'Link';
    
    // Create the popup menu component - only show if this popup is globally active
    const popupMenu = isPopupActive && isHovered && isMountedRef.current && (
        <div 
            ref={menuRef}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl backdrop-blur-sm py-2 min-w-[300px] text-gray-700 dark:text-gray-200 text-sm overflow-hidden"
            style={getMenuStyle()}
        >
            {/* URL Info Section */}
            <div className="border-b border-gray-100 dark:border-gray-700/50 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
                <div className="font-semibold mb-1.5 truncate text-gray-900 dark:text-gray-100" title={displayText}>
                    {displayText}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate break-all font-mono bg-white/60 dark:bg-gray-700/50 px-2 py-1 rounded-md" title={href}>
                    {truncateUrl(href, 45)}
                </div>
            </div>
            
            <div className="py-1">
                <div 
                    className="px-4 py-2.5 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 cursor-pointer flex items-center gap-3 transition-all duration-200 group"
                    onClick={handleCopyLink}
                >
                    {copied ? (
                        <Check size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                        <Copy size={16} className="text-blue-600 dark:text-blue-400 group-hover:text-green-600 dark:group-hover:text-green-400 flex-shrink-0 transition-colors" />
                    )}
                    <span className={`font-medium ${copied ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        {copied ? 'Copied!' : 'Copy link'}
                    </span>
                </div>
                
                <div 
                    className="px-4 py-2.5 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 dark:hover:from-amber-900/20 dark:hover:to-yellow-900/20 cursor-pointer flex items-center gap-3 transition-all duration-200 group"
                    onClick={handleAddToFavorites}
                >
                    <Bookmark size={16} className="text-amber-600 dark:text-amber-400 group-hover:text-amber-700 dark:group-hover:text-amber-300 flex-shrink-0 transition-colors" />
                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate">Add to favorites</span>
                </div>
                
                <div 
                    className="px-4 py-2.5 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 dark:hover:from-purple-900/20 dark:hover:to-indigo-900/20 cursor-pointer flex items-center gap-3 transition-all duration-200 group"
                    onClick={handleOpenInNewTab}
                >
                    <ExternalLink size={16} className="text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 flex-shrink-0 transition-colors" />
                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate">Open in new tab</span>
                </div>
                
                <div 
                    className="px-4 py-2.5 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 dark:hover:from-orange-900/20 dark:hover:to-red-900/20 cursor-pointer flex items-center gap-3 transition-all duration-200 group"
                    onClick={handleGetContent}
                >
                    <FileText size={16} className="text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 flex-shrink-0 transition-colors" />
                    <span className="font-medium text-gray-700 dark:text-gray-300 truncate">Get content</span>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <span 
                className="relative inline-block"
                onMouseEnter={handleMouseEnter}
                ref={linkRef}
            >
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        "text-blue-600 dark:text-blue-400 underline font-medium",
                        "transition-all duration-200 hover:text-blue-700 dark:hover:text-blue-300",
                        (isHovered && isPopupActive) && "text-blue-800 dark:text-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-md px-2 py-0.5 shadow-sm"
                    )}
                >
                    {children}
                </a>
            </span>
            
            {/* Render popup menu using portal to avoid nesting issues */}
            {popupMenu && typeof document !== 'undefined' && createPortal(popupMenu, document.body)}
        </>
    );
};

// Memoized core component to prevent unnecessary re-renders during streaming
const MemoizedLinkComponentCore = memo(LinkComponentCore, (prevProps, nextProps) => {
    // Only re-render if href or children actually change
    return prevProps.href === nextProps.href && prevProps.children === nextProps.children;
});

// Main export with error boundary
export const LinkComponent = ({ href, children }: { href: string; children: React.ReactNode }) => {
    return (
        <LinkErrorBoundary href={href} fallbackChildren={children}>
            <MemoizedLinkComponentCore href={href}>
                {children}
            </MemoizedLinkComponentCore>
        </LinkErrorBoundary>
    );
};

export default LinkComponent;
