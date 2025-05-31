# useRenderedFields Hook

## Overview

The `useRenderedFields` hook is a utility that encapsulates the complete field resolution and rendering logic for entity forms. It takes unified layout props and returns fully resolved and rendered native and relationship fields, simplifying the process of building forms with mixed field types.

## Purpose

This hook was created to:
- **Encapsulate complexity**: Abstract away the coordination between multiple hooks (`useFieldVisibility`, `useFieldRenderer`, `useFieldConfiguration`, `useEntityCrud`)
- **Simplify usage**: Provide a single interface for getting rendered fields
- **Improve consistency**: Ensure the same field resolution logic is used across all components
- **Reduce boilerplate**: Eliminate repetitive code for field rendering
- **Maintain separation**: Keep native and relationship fields properly separated while still providing a combined view

## Usage

### Basic Usage

```tsx
import { useRenderedFields } from '@/app/entities/hooks/form-related/useRenderedFields';

const MyFormComponent = ({ unifiedLayoutProps }) => {
    const {
        nativeFields,
        relationshipFields,
        allFields,
        visibleFieldsInfo
    } = useRenderedFields(unifiedLayoutProps);

    return (
        <div>
            {/* Render all fields together */}
            {allFields}
            
            {/* Or render them separately */}
            <div className="native-fields">
                {nativeFields}
            </div>
            <div className="relationship-fields">
                {relationshipFields}
            </div>
        </div>
    );
};
```

### With Options

```tsx
const {
    nativeFields,
    relationshipFields,
    allFields,
    visibleFieldsInfo
} = useRenderedFields(unifiedLayoutProps, {
    showRelatedFields: true,        // Include relationship fields (default: true)
    onFieldChange: handleChange,    // Custom field change handler
    forceEnable: true              // Force enable all fields
});
```

### Accessing Field Visibility Information

```tsx
const { visibleFieldsInfo } = useRenderedFields(unifiedLayoutProps);

const {
    visibleNativeFields,      // Array of visible native field names
    visibleRelationshipFields, // Array of visible relationship field names
    visibleFields,            // Combined array of all visible field names
    searchTerm,               // Current search term
    setSearchTerm,            // Function to update search term
    carouselActiveIndex,      // Current carousel index (for carousel layouts)
    setCarouselActiveIndex,   // Function to update carousel index
    toggleField,              // Function to toggle field visibility
    selectAllFields,          // Function to show all fields
    clearAllFields,           // Function to hide all fields
    isSearchEnabled,          // Whether search is enabled
    selectOptions             // Field selection options
} = visibleFieldsInfo;
```

## Return Value

The hook returns an object with the following properties:

### `nativeFields: React.ReactElement[]`
Array of rendered native field components ready for display.

### `relationshipFields: React.ReactElement[]`
Array of rendered relationship field components ready for display.

### `allFields: React.ReactElement[]`
Combined array of all rendered fields (native + relationship) in the correct order.

### `visibleFieldsInfo: object`
Object containing all field visibility state and control functions. This can be passed directly to components that need field visibility controls.

## Options

### `RenderedFieldsOptions`

```tsx
interface RenderedFieldsOptions {
    showRelatedFields?: boolean;    // Whether to include relationship fields (default: true)
    onFieldChange?: (fieldName: string, value: unknown) => void;  // Custom field change handler
    forceEnable?: boolean;          // Force enable all fields regardless of state
}
```

## Migration from Individual Hooks

### Before (ArmaniForm example)
```tsx
// Multiple hook calls and manual field rendering
const { activeRecordCrud } = useEntityCrud(entityKey);
const {
    visibleNativeFields,
    visibleRelationshipFields,
    searchTerm,
    setSearchTerm,
    // ... other visibility props
} = useFieldVisibility(entityKey, unifiedLayoutProps);

const { allowedFields, fieldDisplayNames } = useFieldConfiguration(entityKey, unifiedLayoutProps);

const { getNativeFieldComponent, getRelationshipFieldComponent } = useFieldRenderer(
    entityKey, 
    activeRecordCrud.recordId, 
    unifiedLayoutProps
);

// Manual field rendering
const allRenderedFields = useMemo(() => [
    ...visibleNativeFields.map(getNativeFieldComponent),
    ...visibleRelationshipFields.map(getRelationshipFieldComponent)
], [visibleNativeFields, visibleRelationshipFields, getNativeFieldComponent, getRelationshipFieldComponent]);
```

### After
```tsx
// Single hook call with all fields pre-rendered
const {
    nativeFields,
    relationshipFields,
    allFields: allRenderedFields,
    visibleFieldsInfo: {
        visibleNativeFields,
        visibleRelationshipFields,
        searchTerm,
        setSearchTerm,
        // ... other visibility props
    }
} = useRenderedFields(unifiedLayoutProps);
```

## Benefits

1. **Reduced Complexity**: One hook instead of coordinating 3-4 hooks
2. **Better Performance**: Optimized memoization and rendering logic
3. **Consistency**: Same field resolution logic across all components
4. **Type Safety**: Proper TypeScript support with minimal type assertions
5. **Maintainability**: Changes to field rendering logic only need to be made in one place
6. **Flexibility**: Still provides access to individual field arrays when needed

## Internal Implementation

The hook internally:
1. Extracts entity key from unified props
2. Gets CRUD state using `useEntityCrud`
3. Resolves field visibility using `useFieldVisibility`
4. Gets field renderers using `useFieldRenderer`
5. Renders all fields and memoizes the results
6. Returns properly structured data

This encapsulation ensures that all the complex coordination between hooks is handled automatically while still providing full access to the underlying data when needed. 