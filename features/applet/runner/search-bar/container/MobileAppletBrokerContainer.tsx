// MobileFieldRow.tsx
import React, { useState, ReactNode, Children, cloneElement, isValidElement, ReactElement, useEffect } from 'react';

// Define the expected shape of child components' props
interface FieldChildProps {
  id: string;
  isActive?: boolean;
  onClick?: (id: string) => void;
  onOpenChange?: (open: boolean) => void;
  isLast?: boolean;
  actionButton?: ReactNode;
  preventClose?: boolean;
  isMobile?: boolean;
}

interface MobileAppletBrokerContainerProps {
  children: ReactNode;
  activeContainerId?: string | null;
  setActiveContainerId?: (id: string | null) => void;
  actionButton?: ReactNode;
  className?: string;
}

const MobileAppletBrokerContainer: React.FC<MobileAppletBrokerContainerProps> = ({
  children,
  activeContainerId,  // Container ID - not used for field tracking
  setActiveContainerId,  // Container setter - not used for field tracking
  actionButton,
  className = '',
}) => {
  // Use internal state only - fields are managed internally
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  
  // Initialize with the first field active if nothing is active
  useEffect(() => {
    if (activeFieldId === null) {
      const childArray = Children.toArray(children);
      if (childArray.length > 0 && isValidElement(childArray[0])) {
        const firstFieldId = (childArray[0] as ReactElement<FieldChildProps>).props.id;
        
        if (firstFieldId) {
          setActiveFieldId(firstFieldId);
        }
      }
    }
  }, [children, activeFieldId]);
  
  // Handle field activation
  const handleFieldClick = (id: string) => {
    // We don't allow null (all closed) in mobile view
    setActiveFieldId(id);
  };
  
  // Handle popover state changes - never allow closing all fields
  const handleOpenChange = (open: boolean, id: string) => {
    if (!open) {
      // If trying to close, we keep it open
      return;
    }
    
    setActiveFieldId(id);
  };

  // Clone children and inject props
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
    
    const isLast = index === Children.count(children) - 1;
    const isActive = activeFieldId === fieldId;
    
    // Clone the element with additional props
    return cloneElement(typedChild, {
      isActive: isActive,
      onClick: handleFieldClick,
      onOpenChange: (open: boolean) => handleOpenChange(open, fieldId),
      isLast,
      // We no longer pass the action button since we have the fixed bottom bar
      actionButton: undefined,
      preventClose: true, // Always prevent closing in mobile view
      isMobile: true,
    });
  });

  return (
    <div className={`flex flex-col w-full space-y-4 ${className}`}>
      {enhancedChildren}
    </div>
  );
};

export default MobileAppletBrokerContainer;