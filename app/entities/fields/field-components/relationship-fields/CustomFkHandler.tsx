import React from 'react';
import { FieldComponentProps } from '../../types';
import { EntityKeys } from '@/types/entityTypes';
import { hasCustomFkComponent, getCustomFkComponentName } from './custom-fk-config';
import FieldComponentsFkCustom from './custom/FieldComponentsFkCustom';

type CustomFkHandlerProps = FieldComponentProps<string> & {
    relatedEntity: EntityKeys;
    DefaultComponent: React.ForwardRefExoticComponent<FieldComponentProps<string> & React.RefAttributes<HTMLDivElement>>;
};

/**
 * Handler component that routes foreign key relationships to custom components
 * when available, or falls back to the default implementation.
 */
const CustomFkHandler = React.forwardRef<HTMLDivElement, CustomFkHandlerProps>(
    ({ relatedEntity, DefaultComponent, ...props }, ref) => {
        // Check if this entity has a custom component
        if (hasCustomFkComponent(relatedEntity)) {
            const componentName = getCustomFkComponentName(relatedEntity);
            
            // Route to the appropriate custom component
            switch (componentName) {
                case 'FieldComponentsFkCustom':
                    return <FieldComponentsFkCustom {...props} ref={ref} />;
                
                // Add more custom components here as they're created
                default:
                    console.warn(`Custom component ${componentName} not found for entity ${relatedEntity}. Falling back to default.`);
                    return <DefaultComponent {...props} ref={ref} />;
            }
        }
        
        // Use default component for entities without custom implementations
        return <DefaultComponent {...props} ref={ref} />;
    }
);

CustomFkHandler.displayName = 'CustomFkHandler';

export default CustomFkHandler; 