'use client';
import React, { useState, useEffect, ReactNode } from 'react';

// Define type for the component props
interface FloatingSheetProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  footer?: ReactNode;
  position?: 'right' | 'left' | 'top' | 'bottom' | 'center';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  height?: 'auto' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  spacing?: string;
  rounded?: string;
  className?: string;
  contentClassName?: string;
}

const FloatingSheet: React.FC<FloatingSheetProps> = ({
  children,
  isOpen,
  onClose,
  title = "Sheet Title",
  description,
  footer,
  position = "right",
  showCloseButton = true,
  closeOnBackdropClick = true,
  width = "md",
  height = "auto",
  spacing = "4",
  rounded = "2xl",
  className = "",
  contentClassName = "",
}) => {
  // Create a state to track if the component has been initially rendered
  // This helps with proper DOM mounting even when isOpen starts as false
  const [hasRendered, setHasRendered] = useState(false);

  useEffect(() => {
    // Mark as rendered after the first mount
    if (!hasRendered) {
      setHasRendered(true);
    }
  }, []);

  // Handle body scroll locking when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Function to close the sheet when clicking backdrop
  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose();
    }
  };

  // Determine max width based on the width prop
  const getWidthClass = () => {
    const widthMap: Record<string, string> = {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
      "2xl": "max-w-2xl",
      "3xl": "max-w-3xl",
      "4xl": "max-w-4xl",
      full: "max-w-full",
    };
    
    // For top/bottom positions, use full width by default unless explicitly set
    if ((position === 'top' || position === 'bottom') && width === 'md') {
      return "max-w-full";
    }
    
    return widthMap[width] || "max-w-md";
  };
  
  // Determine height for top/bottom/center positions
  const getHeightClass = () => {
    // Only apply height constraints for top, bottom, or center positions
    if (position === 'right' || position === 'left') {
      return "";
    }
    
    const heightMap: Record<string, string> = {
      sm: "max-h-sm",
      md: "max-h-md",
      lg: "max-h-lg",
      xl: "max-h-xl",
      "2xl": "max-h-2xl",
      "3xl": "max-h-3xl",
      "4xl": "max-h-4xl",
      full: "max-h-full",
      auto: position === 'center' ? "max-h-[85vh]" : "max-h-[50vh]" // Default reasonable heights
    };
    
    return heightMap[height] || heightMap.auto;
  };

  // Determine position classes
  const getPositionClasses = () => {
    const positionMap: Record<string, string> = {
      right: `top-${spacing} bottom-${spacing} right-${spacing}`,
      left: `top-${spacing} bottom-${spacing} left-${spacing}`,
      top: `top-${spacing} left-${spacing} right-${spacing}`,
      bottom: `bottom-${spacing} left-${spacing} right-${spacing}`,
      center: 'inset-0 flex items-center justify-center' // For centered modal style
    };
    
    return positionMap[position] || `top-${spacing} bottom-${spacing} right-${spacing}`;
  };

  // Determine transform classes for animations
  const getTransformClass = () => {
    const transformMap: Record<string, string> = {
      right: isOpen ? 'translate-x-0' : 'translate-x-full',
      left: isOpen ? 'translate-x-0' : '-translate-x-full',
      top: isOpen ? 'translate-y-0' : '-translate-y-full',
      bottom: isOpen ? 'translate-y-0' : 'translate-y-full',
      center: isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0', // Scale + fade for center modal
    };
    
    return transformMap[position] || (isOpen ? 'translate-x-0' : 'translate-x-full');
  };

  const positionClasses = getPositionClasses();
  const widthClass = getWidthClass();
  const heightClass = getHeightClass();
  const transformClass = getTransformClass();

  // CRITICAL: We always render the sheet regardless of isOpen state
  // This ensures state is preserved inside sheet contents
  
  return (
    <>
      {/* Backdrop - Only shown when open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity duration-300"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Sheet - Always rendered but visibility and position controlled by CSS */}
      <div 
        className={`fixed ${positionClasses} z-50 ${position === 'center' ? '' : 'w-full'} ${widthClass} ${heightClass} rounded-${rounded} bg-white dark:bg-slate-900 shadow-lg transform transition-all duration-300 ease-in-out ${transformClass} ${isOpen ? 'visible opacity-100' : 'invisible opacity-0'} h-full ${className}`}
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        aria-labelledby="sheet-title"
      >
        <div className="flex flex-col h-full">
          {/* Header - Only show if title exists or showCloseButton is true */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <div>
                {title && <h2 id="sheet-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>}
                {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
              </div>
              
              {showCloseButton && (
                <button 
                  onClick={onClose}
                  className="rounded-full p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {/* Content area */}
          <div className={`flex-1 overflow-y-auto ${contentClassName}`}>
            {children}
          </div>
          
          {/* Footer - Only render if provided */}
          {footer && (
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FloatingSheet;