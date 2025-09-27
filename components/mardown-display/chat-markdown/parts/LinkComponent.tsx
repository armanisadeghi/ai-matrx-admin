import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from "@/lib/utils";
import { Copy, Check, Bookmark, ExternalLink, FileText } from 'lucide-react';

export const LinkComponent = ({ href, children }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const [copied, setCopied] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [isBrowser, setIsBrowser] = useState(false);
    const linkRef = useRef(null);
    const menuRef = useRef(null);
    
    // Set isBrowser to true on mount (for SSR safety)
    useEffect(() => {
        setIsBrowser(true);
    }, []);
    
    // Handle mouse enter on the link
    const handleMouseEnter = (e) => {
        // Set the menu position to the current mouse position
        setMenuPosition({ x: e.clientX, y: e.clientY });
        setIsHovered(true);
    };
    
    // Add a global mouse move listener when menu is active
    useEffect(() => {
        if (isHovered) {
            document.addEventListener('mousemove', handleMouseMove);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
        }
        
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [isHovered, menuRef.current]);
    
    const handleMouseMove = (e) => {
        if (!menuRef.current) return;
        
        const menuRect = menuRef.current.getBoundingClientRect();
        
        // Check if mouse is within menu boundaries or close to it
        const isMouseNearMenu = (
            e.clientX >= menuRect.left - 20 && 
            e.clientX <= menuRect.right + 20 && 
            e.clientY >= menuRect.top - 20 && 
            e.clientY <= menuRect.bottom + 20
        );
        
        // Keep the menu open if mouse is over or near it
        if (!isMouseNearMenu && !linkRef.current?.contains(document.activeElement)) {
            setIsHovered(false);
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
        const menuWidth = 280; // increased width in pixels
        const menuHeight = 160; // increased approximate height in pixels
        
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
    
    // Create the popup menu component
    const popupMenu = isHovered && isBrowser && (
        <div 
            ref={menuRef}
            className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[280px] text-gray-700 dark:text-gray-200 text-sm"
            style={getMenuStyle()}
        >
            {/* URL Info Section */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-3 py-2">
                {/* Link Text Name */}
                <div className="font-medium mb-1 truncate" title={typeof children === 'string' ? children : 'Link'}>
                    {typeof children === 'string' ? children : 'Link'}
                </div>
                {/* URL */}
                <div className="text-md text-gray-500 dark:text-gray-400 truncate break-all" title={href}>
                    {truncateUrl(href)}
                </div>
            </div>
            
            <ul>
                <li 
                    className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-center gap-2 transition-colors"
                    onClick={handleCopyLink}
                >
                    {copied ? (
                        <Check size={16} className="text-green-500" />
                    ) : (
                        <Copy size={16} className="text-gray-500 dark:text-gray-400" />
                    )}
                    {copied ? 'Copied!' : 'Copy link'}
                </li>
                <li 
                    className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-center gap-2 whitespace-nowrap transition-colors"
                    onClick={handleAddToFavorites}
                >
                    <Bookmark size={16} className="text-gray-500 dark:text-gray-400" />
                    <span className="truncate">Add to favorites</span>
                </li>
                <li 
                    className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-center gap-2 whitespace-nowrap transition-colors"
                    onClick={handleOpenInNewTab}
                >
                    <ExternalLink size={16} className="text-gray-500 dark:text-gray-400" />
                    <span className="truncate">Open in new tab</span>
                </li>
                <li 
                    className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-center gap-2 whitespace-nowrap transition-colors"
                    onClick={handleGetContent}
                >
                    <FileText size={16} className="text-gray-500 dark:text-gray-400" />
                    <span className="truncate">Get content</span>
                </li>
            </ul>
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
                        "text-blue-600 underline font-medium",
                        "transition-all duration-200",
                        isHovered && "text-blue-800 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/50 rounded px-1"
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
