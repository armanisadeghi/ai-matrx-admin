# Admin Components

This directory contains reusable admin components that can be used across different parts of the application. These components are designed to be modular, self-contained, and easily composable.

## Directory Structure

The admin components are organized into feature-based subdirectories:

```
components/admin/
├── README.md                    # This documentation file
├── query-history/               # SQL query history components
│   ├── query-storage.ts         # Storage utilities for query history
│   ├── query-history-overlay.tsx # Full-screen overlay for browsing queries
│   └── query-history-button.tsx # Button to trigger the overlay
├── data-table/                  # Data table components
├── filters/                     # Filter components
└── layout/                      # Admin-specific layout components
```

## Design Principles

1. **Self-contained features**: Each subdirectory should represent a complete feature or related set of components.
   
2. **Consistent naming**: Use descriptive, consistent naming conventions:
   - Utility files: `feature-name.ts`
   - Components: `feature-name-component.tsx`
   - Types: `feature-name-types.ts`

3. **Minimize dependencies**: Components should depend on shared UI components from `components/ui/` but minimize dependencies on other admin components.

4. **Light/dark mode support**: All components should support both light and dark themes using Tailwind's dark mode variants.

5. **Responsive design**: All components should be responsive and work on mobile, tablet, and desktop.

6. **Consistent UI/UX**: Use the shared `FullScreenOverlay` component from `components/official/` for all full-screen modals to maintain consistency.

## Component Guidelines

### Structure

Each admin component should typically include:

1. A main component file
2. Any necessary utility/helper files
3. Types and interfaces
4. Documentation comments

### Best Practices

1. **Composability**: Design components to be easily composed with other components.
   
2. **Props design**: Use consistent prop naming across components.
   
3. **State management**: Keep state local when possible, use context for shared state within a feature.
   
4. **Error handling**: Include proper error states and loading states.

5. **Accessibility**: Ensure components are accessible (keyboard navigation, ARIA attributes, etc.).

## Example Usage

Here's an example of how to use the query history components:

```tsx
import { QueryHistoryButton } from "@/components/admin/query-history/query-history-button";

export default function AdminPage() {
  const handleSelectQuery = (query: string) => {
    // Do something with the selected query
    console.log("Selected query:", query);
  };

  return (
    <div>
      <h1>Admin Page</h1>
      <QueryHistoryButton onSelectQuery={handleSelectQuery} />
    </div>
  );
}
```

## FullScreenOverlay Integration

Many admin components use the `FullScreenOverlay` component from `components/official/` to provide a consistent user experience. This component:

- Supports multiple tabs in a single overlay
- Provides consistent styling and behavior
- Makes it easy to add new functionality
- Ensures UI consistency across the application

When creating new admin components that need a full-screen modal:

1. Always use the `FullScreenOverlay` component
2. Implement your component as one or more tabs
3. Follow the TabDefinition interface to define content

Example:

```tsx
import FullScreenOverlay, { TabDefinition } from '@/components/official/FullScreenOverlay';

// Define tabs
const tabs: TabDefinition[] = [
  {
    id: 'main-tab',
    label: 'Main',
    content: <YourComponent />
  },
  {
    id: 'settings-tab',
    label: 'Settings',
    content: <SettingsComponent />
  }
];

// Use in your component
<FullScreenOverlay
  isOpen={isOpen}
  onClose={onClose}
  title="Your Feature"
  tabs={tabs}
  initialTab="main-tab"
/>
```

## Adding New Components

When adding new admin components:

1. Create a new directory for the feature if it doesn't exist
2. Follow the naming conventions
3. Include proper documentation and typing
4. Add any necessary utility functions in a separate file
5. Update this README if adding a major new feature category

## Testing

Each component should be tested for:

1. Functionality
2. Responsiveness
3. Accessibility
4. Light/dark mode appearance 