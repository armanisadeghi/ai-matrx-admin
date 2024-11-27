import {EntityKeys, EntitySelectOption} from '@/types/entityTypes';
import {EntitySelectStyle, EntitySelectVariant} from "@/types/componentConfigTypes";


// Import all your existing components
import {
    MinimalEntitySelect,
    CompactEntitySelect,
    CardEntitySelect,
    ProminentEntitySelect,
    InlineEntitySelect,
    FloatingEntitySelect
} from './EntitySelectStyles';

import {
    EntityCardGrid,
    EntityChips,
    EntityCommandMenu,
    EntityCarousel,
    EntityTree
} from './EntitySelectVariants';

interface EntitySelectCombinedProps<TEntity extends EntityKeys> {
    value: TEntity | undefined;
    options: EntitySelectOption<TEntity>[];
    onValueChange: (value: TEntity) => void;
    placeholder?: string;
    style?: EntitySelectStyle;
    variant?: EntitySelectVariant;
    className?: string;
}

// Wrapper Component
export const EntitySelectOptionComponent = <TEntity extends EntityKeys>(
    {
        style = 'card',
        variant = 'default',
        ...props
    }: EntitySelectCombinedProps<TEntity>) => {
    // Style Components mapping
    const StyleComponents = {
        minimal: MinimalEntitySelect,
        compact: CompactEntitySelect,
        card: CardEntitySelect,
        prominent: ProminentEntitySelect,
        inline: InlineEntitySelect,
        floating: FloatingEntitySelect,
    } as const;

    // Variant Components mapping
    const VariantComponents = {
        default: StyleComponents[style],
        grid: EntityCardGrid,
        chips: EntityChips,
        command: EntityCommandMenu,
        carousel: EntityCarousel,
        tree: EntityTree,
    } as const;

    const SelectedComponent = VariantComponents[variant];

    return <SelectedComponent {...props} />;
};

// Helper type to get all available combinations
export type EntitySelectCombination = {
    style: EntitySelectStyle;
    variant: EntitySelectVariant;
};

// Helper function to check if a combination is valid
export const isValidCombination = (style: EntitySelectStyle, variant: EntitySelectVariant): boolean => {
    // Add any invalid combinations here
    const invalidCombinations: EntitySelectCombination[] = [
        // Example: { style: 'minimal', variant: 'carousel' }
    ];

    return !invalidCombinations.some(
        combo => combo.style === style && combo.variant === variant
    );
};
