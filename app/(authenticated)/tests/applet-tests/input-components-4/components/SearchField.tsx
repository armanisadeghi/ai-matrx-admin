// SearchField.tsx
import React, { ReactNode } from 'react';

interface SearchFieldProps {
  id: string;
  label: string;
  placeholder: string;
  isActive: boolean;
  onClick: (id: string) => void;
  onOpenChange: (open: boolean) => void;
  isLast?: boolean;
  actionButton?: ReactNode;
  children: ReactNode;
  className?: string;
  preventClose?: boolean; // Added this missing prop
}

const SearchField: React.FC<SearchFieldProps> = ({
  id,
  label,
  placeholder,
  isActive,
  onClick,
  onOpenChange,
  isLast = false,
  actionButton = null,
  children,
  className = '',
  preventClose = false // Default to false
}) => {
  const handleOutsideClick = () => {
    // Only close if not prevented
    if (isActive && !preventClose) {
      onOpenChange(false);
    }
  };

  // We'll use these variables in CSS to control visibility
  const popoverStyle = {
    display: isActive ? 'block' : 'none',
    position: 'absolute' as const,
    top: 'calc(100% + 8px)',
    left: isLast ? 'auto' : '0',
    right: isLast ? '0' : 'auto',
    zIndex: 50,
    minWidth: '320px',
    backgroundColor: 'white', // Using direct colors instead of CSS vars
    borderRadius: '0.375rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  };

  return (
    <div className="field-container flex-1 relative">
      {/* Overlay for closing when clicking outside */}
      {isActive && !preventClose && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={handleOutsideClick}
        />
      )}
      
      {/* Trigger button */}
      <button 
        className={`flex-1 w-full text-left py-3 px-6 focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-700 ${!isLast ? 'border-r dark:border-gray-700' : ''} ${actionButton ? 'flex items-center' : ''} ${className}`}
        onClick={() => onClick(id)}
      >
        <div className={actionButton ? 'flex-grow' : ''}>
          <div className="font-semibold text-xs text-gray-800 dark:text-gray-200">{label}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{placeholder}</div>
        </div>
        {actionButton}
      </button>
      
      {/* Popover content - always mounted but conditionally visible */}
      <div 
        style={popoverStyle} 
        className="bg-white dark:bg-gray-800 border dark:border-gray-700"
      >
        {children}
      </div>
    </div>
  );
};

export default SearchField;