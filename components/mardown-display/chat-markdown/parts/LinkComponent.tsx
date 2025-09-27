import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from "@/lib/utils";
import { Copy, Check, Bookmark, ExternalLink, FileText } from 'lucide-react';

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
    
    const openPopup = () => setActivePopup(componentId);
    const closePopup = () => setActivePopup(null);
    
    return { isActive, openPopup, closePopup };
};

export const LinkComponent = ({ href, children }) => {
    // Generate unique ID for this component instance
    const [componentId] = useState(() => `link-popup-${Math.random().toString(36).substr(2, 9)}`);
    
    const [isHovered, setIsHovered] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const [copied, setCopied] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [isBrowser, setIsBrowser] = useState(false);
    const linkRef = useRef(null);
    const menuRef = useRef(null);
    
    // Use global popup state
    const { isActive: isPopupActive, openPopup, closePopup } = useGlobalPopupState(componentId);
    
    // Set isBrowser to true on mount (for SSR safety)
    useEffect(() => {
        setIsBrowser(true);
    }, []);
    
    // Handle mouse enter on the link
    const handleMouseEnter = (e) => {
        // Set the menu position to the current mouse position
        setMenuPosition({ x: e.clientX, y: e.clientY });
        setIsHovered(true);
        // Open this popup (will close any other open popup)
        openPopup();
    };
    
    // Add a global mouse move listener when this popup is active
    useEffect(() => {
        if (isPopupActive && isHovered) {
            document.addEventListener('mousemove', handleMouseMove);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
        }
        
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isPopupActive, isHovered, menuRef.current]);
    
    // Sync local hover state with global popup state
    useEffect(() => {
        if (!isPopupActive) {
            setIsHovered(false);
        }
    }, [isPopupActive]);
    
    const handleMouseMove = (e) => {
        if (!menuRef.current || !isPopupActive) return;
        
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
        if (!isMouseNearMenu && !isMouseNearLink && !linkRef.current?.contains(document.activeElement)) {
            setIsHovered(false);
            closePopup();
        }
    };
    
    const handleCopyLink = () => {
        navigator.clipboard.writeText(href)
            .then(() => {
                console.log('Link copied to clipboard');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
                console.error('Failed to copy link: ', err);
            });
    };
    
    const handleAddToFavorites = () => {
        const newFavorites = [...favorites, { url: href, title: children }];
        setFavorites(newFavorites);
        console.log('Added to favorites:', newFavorites);
    };
    
    const handleOpenInNewTab = () => {
        window.open(href, '_blank', 'noopener,noreferrer');
    };
    
    const handleGetContent = () => {
        console.log('Getting content from:', href);
        // This just logs for now, but could be expanded later
    };

    // Calculate menu position
    const getMenuStyle = () => {
        if (!menuPosition) return {};
        
        // Ensure the menu is visible within viewport
        const menuWidth = 300; // updated width to match new styling
        const menuHeight = 200; // updated approximate height for new styling
        
        // Get window dimensions
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Calculate position to keep menu in viewport
        let left = menuPosition.x;
        let top = menuPosition.y;
        
        // Adjust if menu would go outside viewport
        if (left + menuWidth > windowWidth) {
            left = windowWidth - menuWidth - 10;
        }
        
        if (top + menuHeight > windowHeight) {
            top = windowHeight - menuHeight - 10;
        }
        
        return {
            position: 'fixed' as const,
            top: `${top}px`,
            left: `${left}px`,
            zIndex: 100
        };
    };
    
    // Function to truncate URL if it's too long
    const truncateUrl = (url, maxLength = 40) => {
        if (url.length <= maxLength) return url;
        const start = url.substring(0, maxLength / 2);
        const end = url.substring(url.length - maxLength / 2);
        return `${start}...${end}`;
    };
    
    // Create the popup menu component - only show if this popup is globally active
    const popupMenu = isPopupActive && isHovered && isBrowser && (
        <div 
            ref={menuRef}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl backdrop-blur-sm py-2 min-w-[300px] text-gray-700 dark:text-gray-200 text-sm overflow-hidden"
            style={getMenuStyle()}
        >
            {/* URL Info Section */}
            <div className="border-b border-gray-100 dark:border-gray-700/50 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
                {/* Link Text Name */}
                <div className="font-semibold mb-1.5 truncate text-gray-900 dark:text-gray-100" title={typeof children === 'string' ? children : 'Link'}>
                    {typeof children === 'string' ? children : 'Link'}
                </div>
                {/* URL */}
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
            {popupMenu && createPortal(popupMenu, document.body)}
        </>
    );
};

export default LinkComponent;
