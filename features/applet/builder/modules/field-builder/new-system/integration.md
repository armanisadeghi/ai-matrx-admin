# New Field Rendering System Integration Guide

This document explains how to integrate the new field rendering system into the existing codebase.

## Overview

The new field rendering system uses the existing Redux infrastructure but properly sets up broker map entries to allow field components to access their values through the Redux store. This approach enables us to use the same field components in both the applet runner and the field builder.

## Files in the New System

1. **PreviewFieldController.tsx**
   - Creates broker map entries for field components
   - Uses the existing field controller with a preview applet ID

2. **NewFieldRenderer.tsx**
   - Renders field components using the PreviewFieldController
   - Includes label, help text, and required indicators

3. **NewFieldPreview.tsx**
   - Provides a preview of the field component
   - Allows switching between different component types

## Integration Steps

### Step 1: Temporary Testing

To test the new system without breaking existing functionality, modify the `FieldPreview.tsx` file to use the new components:

```tsx
// In FieldPreview.tsx
import React, { useState } from "react";
// ... existing imports ...
import NewFieldPreview from './new-system/NewFieldPreview'; // Add this import

interface FieldPreviewProps {
    field: any;
    componentType: ComponentType | null;
}

const FieldPreview: React.FC<FieldPreviewProps> = ({ field, componentType }) => {
    // ... existing code ...

    return (
        <SectionCard title="Component Preview" color="gray" spacing="relaxed">
            {/* Comment out the existing renderer and use the new one */}
            {/* Original code:
            <div className="mt-6 mb-8 border border-gray-300 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-900 shadow-sm rounded-xl min-h-[250px]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-md font-semibold capitalize text-gray-900 dark:text-gray-100">
                        Your New{" "}
                        <span className="text-blue-600 dark:text-blue-500 font-bold">
                            {" "}
                            {componentType} {"  "}
                        </span>{" "}
                        Component
                    </h3>
                    <ThemeSwitcherIcon />
                </div>
                {field && <FieldRenderer field={field} />}
            </div>
            */}
            
            {/* New system: */}
            <NewFieldPreview field={field} componentType={componentType} />
        </SectionCard>
    );
};

export default FieldPreview;
```

### Step 2: Full Integration

Once testing confirms the new system works correctly, we can replace the old components completely:

1. Rename the files in the new-system directory:
   - `NewFieldRenderer.tsx` → `FieldRenderer.tsx`
   - `NewFieldPreview.tsx` → `FieldPreview.tsx`
   - Move `PreviewFieldController.tsx` to the parent directory

2. Update imports in all files to use the new components.

3. Delete the old files or keep them with different names for reference.

## Implementation Notes

- The `PreviewFieldController` creates a broker map entry for each field, allowing it to store and retrieve values using the existing Redux selectors.

- We use a consistent `previewAppletId` to ensure all fields in the preview belong to the same "applet".

- When showing alternate component types, we create a new field ID by appending the component type to the original ID to ensure it gets its own broker map entry.

- If you need to reset the broker map (e.g., for testing), you can dispatch the `resetMapFull` action:

  ```tsx
  import { resetMapFull } from '@/lib/redux/app-runner/slices/brokerSlice';
  
  // In your component
  const dispatch = useAppDispatch();
  
  // Reset the map
  dispatch(resetMapFull());
  ``` 