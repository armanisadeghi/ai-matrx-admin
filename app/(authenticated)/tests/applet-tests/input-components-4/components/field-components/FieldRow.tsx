// FieldRow.tsx
import React, { useState, ReactNode, Children, cloneElement, isValidElement, ReactElement } from 'react';

// Define the expected shape of child components' props
interface FieldChildProps {
  id: string;
  isActive?: boolean;
  onClick?: (id: string) => void;
  onOpenChange?: (open: boolean) => void;
  isLast?: boolean;
  actionButton?: ReactNode;
}

interface FieldRowProps {
  children: ReactNode;
  activeFieldId?: string | null;
  onActiveFieldChange?: (id: string | null) => void;
  actionButton?: ReactNode;
  className?: string;
}

const FieldRow: React.FC<FieldRowProps> = ({
  children,
  activeFieldId: externalActiveFieldId,
  onActiveFieldChange,
  actionButton,
  className = '',
}) => {
  // Use internal state if no external control is provided
  const [internalActiveFieldId, setInternalActiveFieldId] = useState<string | null>(null);
  
  // Determine which active field state to use
  const activeFieldId = externalActiveFieldId !== undefined 
    ? externalActiveFieldId 
    : internalActiveFieldId;
  
  // Handle field activation
  const handleFieldClick = (id: string) => {
    const newActiveId = id === activeFieldId ? null : id;
    
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
    
    // Clone the element with additional props
    return cloneElement(typedChild, {
      isActive: activeFieldId === fieldId,
      onClick: handleFieldClick,
      onOpenChange: handleOpenChange,
      isLast,
      actionButton: fieldActionButton,
    });
  });

  return (
    <div className={`flex w-full rounded-lg border dark:border-gray-700 ${className}`}>
      {enhancedChildren}
    </div>
  );
};

export default FieldRow;