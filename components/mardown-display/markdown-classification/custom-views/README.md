# Adding New Custom Views

This document explains how to add new view components to the markdown classification system.

## Overview

The view system is designed to be modular and easy to extend. The system consists of:

1. **Components** - React components that render different views of the processed data
2. **Registry** - A central registry that maps config types to available views
3. **Renderer** - A component that displays the appropriate view based on user selection

## How to Add a New View

Adding a new view is a simple 4-step process:

### Step 1: Create the View Component

Create a new file in the `custom-views` directory, following these guidelines:

```tsx
// Example: MyNewView.tsx
import React from 'react';

const MyNewView = ({ data }) => {
  // Handle missing or malformed data gracefully
  const extracted = data?.extracted || {};
  
  return (
    <div className="...">
      {/* Your custom view implementation */}
      <h1>{extracted.name || 'Unnamed'}</h1>
      {/* Render other extracted data */}
    </div>
  );
};

export default MyNewView;
```

### Step 2: Register the Component in the Registry

Open `registry.ts` and add your component to the `viewComponents` section:

```ts
export const viewComponents = {
  // Existing components
  standardView: lazy(() => import('./CandidateProfileView')),
  collapsibleView: lazy(() => import('./CandidateProfileWithCollapse')),
  
  // Add your new component
  myNewView: lazy(() => import('./MyNewView')),
};
```

### Step 3: Add an Entry to the View Entries

In the same file, add your view to the `viewEntries` section:

```ts
export const viewEntries: Record<string, ConfigViewEntry> = {
  // Existing entries
  standard: { ... },
  
  // Add your new entry
  myNewViewType: {
    id: 'myNewViewType',
    name: 'My New View',
    component: viewComponents.myNewView,
    description: 'Description of your custom view'
  },
};
```

### Step 4: Map Config Types to Your View

Finally, specify which config types should have access to your view:

```ts
export const configViewMappings: Record<string, string[]> = {
  // Update existing mappings
  candidate_profile: ['standard', 'collapsible', 'myNewViewType'],
  
  // Or add mappings for new config types
  my_new_config: ['standard', 'myNewViewType'],
};

// Optionally, set your view as the default for a config type
export const defaultViews: Record<string, string> = {
  // Existing defaults
  candidate_profile: 'standard',
  
  // Set your view as default for a specific config type
  my_new_config: 'myNewViewType',
};
```

## Testing Your New View

Once you've completed these steps, your new view will be automatically available in the UI dropdown when:

1. The corresponding config type is selected
2. The data is processed with the appropriate configuration

No changes to the renderer or other components are required.

## Best Practices

- Ensure your view handles missing data gracefully
- Follow the existing design patterns for consistency
- Use Tailwind classes for styling
- Include responsive design considerations
- Add detailed type definitions

## Troubleshooting

If your view doesn't appear:

1. Check that it's properly imported in the registry
2. Verify the config type mapping includes your view
3. Make sure your component is exported as default
4. Check the console for any errors 