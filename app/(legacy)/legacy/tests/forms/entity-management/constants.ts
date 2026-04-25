import {
    EntitySelectStyle,
    EntitySelectVariant
} from '@/types/componentConfigTypes';

// Additional settings that aren't part of the unified structure yet
export interface AdditionalEntityPageSettings {
    isFullScreen: boolean;
    entitySelectStyle: EntitySelectStyle;
    entitySelectVariant: EntitySelectVariant;
}

export const ADDITIONAL_SETTINGS_DEFAULTS: AdditionalEntityPageSettings = {
    isFullScreen: false,
    entitySelectStyle: 'default',
    entitySelectVariant: 'default',
};

// NOTE: All other defaults are now managed centrally in /app/entities/layout/configs.ts
// Use getUnifiedLayoutProps() to get properly structured defaults for UnifiedLayoutProps
