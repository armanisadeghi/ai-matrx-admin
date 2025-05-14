// features\applet\runner\layouts\options\horizontal-layout\DesktopAppletBrokerContainer.tsx
"use client";

import React, { useState, ReactNode, Children, cloneElement, isValidElement, ReactElement } from 'react';

// Define the expected shape of child components' props
export interface FieldChildProps {
  id: string;
  isActive?: boolean;
  onClick?: (id: string) => void;
  onOpenChange?: (open: boolean) => void;
  isLast?: boolean;
  actionButton?: ReactNode;
}

export interface DesktopAppletBrokerContainerProps {
  children: ReactNode;
  activeContainerId?: string | null;  // Changed from activeFieldId
  setActiveContainerId?: (id: string | null) => void;  // Changed from onActiveFieldChange
  actionButton?: ReactNode;
  className?: string;
  isMobile?: boolean;
}

const DesktopAppletBrokerContainer: React.FC<DesktopAppletBrokerContainerProps> = ({
  children,
  activeContainerId,  // Container ID - not used for field tracking
  setActiveContainerId,  // Container setter - not used for field tracking
  actionButton,
  className = '',
  isMobile = false,
}) => {
  // Use internal state only - fields are managed internally
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  
  // Handle field activation
  const handleFieldClick = (id: string) => {
    const newActiveId = id === activeFieldId ? null : id;
    setActiveFieldId(newActiveId);
  };
  
  // Handle popover state changes
  const handleOpenChange = (open: boolean, id: string) => {
    if (!open) {
      setActiveFieldId(null);
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
      onOpenChange: (open: boolean) => handleOpenChange(open, fieldId),
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

export default DesktopAppletBrokerContainer;