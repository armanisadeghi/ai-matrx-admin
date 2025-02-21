// File: components/search/core/FieldRow.tsx
// This is your existing FieldRow with minor modifications
import React, { useState, ReactNode, Children, cloneElement, isValidElement, ReactElement } from 'react';
import { FieldChildProps } from '../input-components-4/components/search-bar/row/DesktopFieldRow';


interface FieldRowProps {
    children: ReactNode;
    activeFieldId?: string | null;
    onActiveFieldChange?: (id: string | null) => void;
    actionButton?: ReactNode;
    className?: string;
    isMobile?: boolean;
  }
  
  const FieldRow: React.FC<FieldRowProps> = ({
    children,
    activeFieldId: externalActiveFieldId,
    onActiveFieldChange,
    actionButton,
    className = '',
    isMobile = false,
  }) => {
    // Use internal state if no external control is provided
    const [internalActiveFieldId, setInternalActiveFieldId] = useState<string | null>(null);
    
    // Determine which active field state to use
    const activeFieldId = externalActiveFieldId !== undefined 
      ? externalActiveFieldId 
      : internalActiveFieldId;
    
    // Handle field activation
    const handleFieldClick = (id: string) => {
      // Always set to the clicked id, regardless of current state
      // This ensures that clicking on a different field always opens it
      const newActiveId = id;
      
      // Update internal state if needed
      if (externalActiveFieldId === undefined) {
        setInternalActiveFieldId(newActiveId);
      }
      
      // Notify parent if callback exists
      if (onActiveFieldChange) {
        onActiveFieldChange(newActiveId);
      }
    };
    
    // Handle popover state changes
    const handleOpenChange = (open: boolean) => {
      if (!open && onActiveFieldChange) {
        onActiveFieldChange(null);
      } else if (!open) {
        setInternalActiveFieldId(null);
      }
    };
    
    // Clone children and inject props
    const childrenCount = Children.count(children);
    const enhancedChildren = Children.map(children, (child, index) => {
      // Skip non-element children
      if (!isValidElement(child)) return child;
      
      // Type assertion to access the id property
      const typedChild = child as ReactElement<FieldChildProps>;
      const fieldId = typedChild.props.id;
      
      // Skip if no id (should never happen with proper children)
      if (!fieldId) {
        console.warn('Field child missing required id prop');
        return child;
      }
      
      const isLast = index === childrenCount - 1;
      
      // Add action button only to the last field if provided
      const fieldActionButton = isLast ? actionButton : undefined;
      
      // Create a specialized onClick handler for this field
      const fieldClickHandler = (id: string) => {
        // If this field is already active and clicked again, close it
        if (activeFieldId === id) {
          if (onActiveFieldChange) {
            onActiveFieldChange(null);
          } else {
            setInternalActiveFieldId(null);
          }
        } else {
          // Otherwise, just call the normal handler to open it
          handleFieldClick(id);
        }
      };
      
      // Clone the element with additional props
      return cloneElement(typedChild, {
        isActive: activeFieldId === fieldId,
        onClick: fieldClickHandler,
        onOpenChange: handleOpenChange,
        isLast,
        actionButton: fieldActionButton,
      });
    });
    
    return (
      <div className={`flex rounded-full border shadow-lg bg-white dark:bg-gray-800 dark:border-gray-700 ${className}`}>
        {enhancedChildren}
      </div>
    );
  };
  
  export default FieldRow;
  