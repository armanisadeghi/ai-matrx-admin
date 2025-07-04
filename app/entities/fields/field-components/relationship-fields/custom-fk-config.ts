import { EntityKeys } from '@/types';

export interface CustomFkConfig {
    entity: EntityKeys;
    componentName: string;
}

/**
 * Configuration for entities that should use custom foreign key components
 * instead of the default select dropdown.
 */
export const CUSTOM_FK_COMPONENTS: CustomFkConfig[] = [
    {
        entity: 'fieldComponents',
        componentName: 'FieldComponentsFkCustom'
    }
    // Add more custom components here as needed
];

/**
 * Check if an entity should use a custom foreign key component
 */
export function hasCustomFkComponent(entityKey: EntityKeys): boolean {
    return CUSTOM_FK_COMPONENTS.some(config => config.entity === entityKey);
}

/**
 * Get the custom component name for an entity
 */
export function getCustomFkComponentName(entityKey: EntityKeys): string | null {
    const config = CUSTOM_FK_COMPONENTS.find(config => config.entity === entityKey);
    return config?.componentName || null;
} 