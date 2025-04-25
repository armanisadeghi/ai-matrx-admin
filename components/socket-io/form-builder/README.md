# Redux-Based Dynamic Form System

## Overview

This form system provides a robust framework for building dynamic forms with complete Redux integration. Each field component directly interacts with Redux for state management, validation, and data flow, ensuring a clean separation between UI components and business logic.

## Key Features

- **Redux-Powered**: All form data is stored in Redux, not local component state
- **Component Autonomy**: Each field component directly interacts with Redux selectors and actions
- **Self-Validation**: Components handle their own validation logic
- **Schema-Driven**: Form structure is derived from a schema
- **Extensible**: Support for custom field components with specific props
- **Complex Data Support**: Handles arrays, nested objects, and related entities

## Folder Structure

```
components/socket-io/form-builder/
  ├── ActionButtons.tsx           # Form submission and action buttons
  ├── ArrayField.tsx              # Handles array-type fields
  ├── ArrayFieldSection.tsx       # UI for array fields with schema references
  ├── DynamicForm.tsx             # Main form component
  ├── FormField.tsx               # Field dispatcher component
  ├── FormFieldGroup.tsx          # Groups related fields
  ├── RelatedObjectSection.tsx    # Handles related object fields
  ├── TaskDataDebug.tsx           # Debug component for form data
  ├── field-components/           # Individual field type components
  │   ├── FieldRenderer.tsx       # Renders the appropriate field component
  │   ├── SocketTaskCheckbox.tsx  # Checkbox input
  │   ├── SocketTaskInput.tsx     # Text input
  │   ├── SocketTaskJsonEditor.tsx # JSON editor
  │   ├── SocketTaskMultiFileUpload.tsx # File upload
  │   ├── SocketTaskRadioGroup.tsx # Radio button group
  │   ├── SocketTaskSelect.tsx    # Select dropdown
  │   ├── SocketTaskSlider.tsx    # Slider input
  │   ├── SocketTaskSwitch.tsx    # Toggle switch
  │   ├── SocketTaskTextarea.tsx  # Text area
  │   └── index.ts                # Exports all field components
  └── field-sections/             # Specialized field section components
```

## Basic Usage

```tsx
import DynamicForm from '@/components/socket-io/form-builder/DynamicForm';

// The component expects a taskId prop
<DynamicForm
  taskId="your-task-id"
  onSubmit={(data) => console.log('Form submitted with data:', data)}
  minimalSpace={false} // Optional, for compact UI
  testMode={false} // Optional, for testing
  showDebug={false} // Optional, shows form data for debugging
/>
```

## Prerequisites

Before using the form, you need to:

1. Initialize a task in Redux with the correct taskName and initial data
2. Make sure your schema is defined in the schema constants

```tsx
// Example of initializing a task
import { initializeTask } from '@/lib/redux/socket-io/slices/socketTasksSlice';
import { v4 as uuidv4 } from 'uuid';

const taskId = uuidv4();
dispatch(initializeTask({
  taskId,
  service: 'yourService',
  taskName: 'yourTaskName',
  connectionId: 'yourConnectionId'
}));
```

## Schema Format

The schema defines the structure and behavior of the form:

```js
{
  "fieldName": {
    "REQUIRED": true,
    "DEFAULT": "default value",
    "VALIDATION": "validation_rule",
    "DATA_TYPE": "string", // string, number, boolean, array, object
    "CONVERSION": null,
    "REFERENCE": null, // For array or object fields that reference another schema
    "ICON_NAME": "File", // Lucide icon name
    "COMPONENT": "input", // Matches component types in field-components
    "COMPONENT_PROPS": {
      "className": "custom-class",
      // Component-specific props go here
    },
    "DESCRIPTION": "Field description",
    "TEST_VALUE": "Test value for auto-population when testMode is true"
  }
}
```

## Creating Custom Field Components

The most important aspect of this system is how field components work directly with Redux. Each component must follow this pattern to work within the system.

### Component Template

Here's a template for creating a new field component:

```tsx
import React, { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { 
  selectFieldValue, 
  selectTestMode, 
  selectTaskNameById,
  updateTaskFieldByPath 
} from "@/lib/redux/socket-io";
import { SchemaField } from "@/constants/socket-schema";
import { isValidField } from "@/constants/socket-schema";

interface YourComponentProps {
  taskId: string;
  fieldName: string;
  fieldDefinition: SchemaField;
  fullPath: string;
  initialValue: any;
  showPlaceholder?: boolean;
  propOverrides?: Record<string, any>;
}

const YourComponent: React.FC<YourComponentProps> = ({
  taskId,
  fieldName,
  fieldDefinition,
  fullPath,
  initialValue,
  showPlaceholder = true,
  propOverrides = {},
}) => {
  // 1. Create local dispatch and state hooks
  const dispatch = useAppDispatch();
  const [hasError, setHasError] = useState(false);
  const [notice, setNotice] = useState("");

  // 2. Get the current value from Redux store using selectors
  const currentValue = useAppSelector((state) => selectFieldValue(taskId, fullPath)(state));
  const testMode = useAppSelector(selectTestMode);
  const taskName = useAppSelector((state) => selectTaskNameById(state, taskId));

  // 3. Initialize the field in Redux on component mount
  useEffect(() => {
    dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: initialValue }));
  }, []);

  // 4. Handle test mode
  useEffect(() => {
    if (testMode && fieldDefinition.TEST_VALUE !== undefined) {
      dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: fieldDefinition.TEST_VALUE }));
    }
  }, [testMode]);

  // 5. Create validation method using the schema validator
  const validateField = useCallback(
    (value: any) => isValidField(taskName, fullPath, value),
    [taskName, fullPath]
  );

  // 6. Handler for value changes - always update Redux
  const handleChange = (newValue: any) => {
    dispatch(updateTaskFieldByPath({ taskId, fieldPath: fullPath, value: newValue }));
  };

  // 7. Handler for validation (typically on blur)
  const handleBlur = () => {
    if (currentValue) {
      const { isValid, errorMessage } = validateField(currentValue);
      setHasError(!isValid);
      setNotice(isValid ? "" : errorMessage);
    }
  };

  // 8. Render your component UI
  return (
    <div className="flex flex-col gap-2">
      {/* Your component UI here */}
      {notice && <span className="text-yellow-600 text-sm">{notice}</span>}
    </div>
  );
};

export default YourComponent;
```

### Key Implementation Guidelines

1. **Redux Integration**
   - Use `useAppSelector` hooks to read field data directly from Redux
   - Use `updateTaskFieldByPath` action to update the field value in Redux
   - Initialize field data on component mount

2. **Self Validation**
   - Each component is responsible for its own validation
   - Display error state and messages within the component
   - Use `isValidField` to validate against the schema rules

3. **Test Mode Support**
   - Implement test mode to pre-fill fields with test data
   - Check for `fieldDefinition.TEST_VALUE`

4. **Component Props**
   - Handle `COMPONENT_PROPS` from schema definition
   - Support override props for customization
   - Process props correctly (e.g., merging classes)

5. **Accessibility & UX**
   - Provide proper ARIA attributes
   - Handle placeholder text properly
   - Support both light and dark mode with Tailwind

### Registering Your Component

After creating your component:

1. Add it to the exports in `field-components/index.ts`:
   ```ts
   export { default as YourComponent } from './YourComponent';
   ```

2. Add it to the components map in `FieldRenderer.tsx`:
   ```ts
   const FIELD_COMPONENTS: Record<string, React.FC<FieldComponentProps>> = {
     // existing components
     yourcomponent: YourComponent,
     // ...
   };
   ```

## Special Field Types

### Array Fields

Array fields require special handling. The system uses:

- `ArrayField.tsx` - For simple arrays
- `ArrayFieldSection.tsx` - For arrays of objects that follow a schema reference

Array fields support operations like add, remove, reorder, and validate items individually.

### Object Fields

For related object fields, use:

- `RelatedObjectSection.tsx` - Handles nested object data with proper path resolution

## Customizing Fields at Runtime

You can override field types and props using the `fieldOverrides` prop:

```tsx
<DynamicForm
  taskId="your-task-id"
  fieldOverrides={{
    'field-key': {
      type: 'textarea', // Change the component type
      props: {
        className: 'custom-class',
        placeholder: 'Custom placeholder',
        // Component-specific props
      }
    }
  }}
/>
```

## Testing

Use the `testMode` prop to automatically populate fields with test values from your schema:

```tsx
<DynamicForm
  taskId="your-task-id"
  testMode={true}
/>
```

In your schema, define test values:

```js
{
  "fieldName": {
    // Regular schema properties
    "TEST_VALUE": "This is a test value"
  }
}
```

## Styling Guidelines

When creating components, follow these Tailwind styling patterns:

- Always provide light and dark variations for colors:
  ```
  text-gray-800 dark:text-gray-300
  bg-zinc-300 dark:bg-zinc-700
  border-zinc-300 dark:border-zinc-700
  ```

- For interactive elements, include hover states:
  ```
  hover:bg-zinc-300 dark:hover:bg-zinc-700
  ```

- For validation states, use consistent colors:
  ```
  // Error state
  border-red-500
  text-red-600

  // Notice/warning state
  text-yellow-600
  ``` 