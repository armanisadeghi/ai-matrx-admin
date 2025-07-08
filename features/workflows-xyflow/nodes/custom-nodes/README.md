# Custom Nodes

This directory contains custom nodes that extend the workflow system functionality.

## DirectInputNode

A node that allows for direct input of various data types within the node itself, without requiring external connections for input values.

### Features

- **Text Input**: Small text field with Type icon
- **Number Input**: Number field with Hash icon  
- **Boolean Switch**: Toggle switch with ToggleLeft icon
- **Select Dropdown**: Dropdown selection with predefined options
- **Long Text Dialog**: Button that opens a dialog for entering longer text content (preserves formatting and whitespace)

### Usage

The DirectInputNode is registered in the workflow system as `directInput` type. It can be added to workflows and will provide output handles for each input type:

- `text_output` - String output from text input
- `number_output` - Number output from number input
- `boolean_output` - Boolean output from switch
- `select_output` - String output from select dropdown
- `long_text_output` - String output from long text dialog

### Integration

The node integrates with the BaseNode system, providing:
- ✅ Compact and detailed display modes
- ✅ Settings modal (double-click to open)
- ✅ Active/inactive state management
- ✅ Proper handle positioning and connection validation
- ✅ Dark/light theme support
- ✅ Consistent styling with other workflow nodes

### Node Data Structure

```typescript
interface DirectInputNodeData {
    textValue?: string;
    numberValue?: number;
    booleanValue?: boolean;
    selectValue?: string;
    longTextValue?: string;
    // ... other BaseNode properties
}
```

### Adding to Workflow

The node is automatically registered in the workflow system. To use it, create a node with `type: "directInput"` in your workflow.

### Customization

The select dropdown options can be customized by modifying the `SelectContent` section in the DirectInputNode component. The long text dialog can be enhanced with additional features like syntax highlighting or formatting options. 