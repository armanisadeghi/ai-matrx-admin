# Redux-Based Dynamic Form System

This form system leverages Redux for state management, providing a clean separation between UI components and business logic.

## Overview

The form system consists of several key components:

1. **DynamicForm**: The main component that renders a form based on a schema
2. **FormField**: Renders individual form fields based on their type
3. **ArrayField**: Handles array-type fields with add/remove functionality

## How to Use

### Basic Usage

```tsx
import DynamicForm from '@/components/socket-io/form-builder/DynamicForm';

// The component expects a taskId prop
<DynamicForm
  taskId="your-task-id"
  onSubmit={(data) => console.log('Form submitted with data:', data)}
  minimalSpace={false} // Optional, for compact UI
  testMode={false} // Optional, for testing
/>
```

### Prerequisites

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

## How It Works

1. The form receives a `taskId` prop
2. It uses Redux selectors to get the task data and validation state
3. Form updates dispatch Redux actions to update the task
4. Schema provides structure, but data comes from Redux

## Key Features

- **No Local State**: All form data is stored in Redux
- **Schema-Based**: Form structure is derived from a schema
- **Validation**: Validation is handled through Redux
- **Array Support**: Supports complex array fields
- **Field Overrides**: Allows customizing field behavior

## Customizing Fields

You can override field types and props using the `fieldOverrides` prop:

```tsx
<DynamicForm
  taskId="your-task-id"
  fieldOverrides={{
    'field-key': {
      type: 'textarea',
      props: {
        className: 'custom-class',
        placeholder: 'Custom placeholder'
      }
    }
  }}
/>
```

## Schema Format

The schema defines the structure and behavior of the form:

```js
{
  "fieldName": {
    "REQUIRED": true,
    "DEFAULT": "default value",
    "VALIDATION": "validation_rule",
    "DATA_TYPE": "string",
    "CONVERSION": null,
    "REFERENCE": null,
    "ICON_NAME": "File",
    "COMPONENT": "input",
    "COMPONENT_PROPS": {
      "className": "custom-class"
    },
    "DESCRIPTION": "Field description"
  }
}
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