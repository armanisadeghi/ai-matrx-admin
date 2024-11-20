# Unified Select System

## Entry Point
**EntitySelect**: Handles all types of selection interfaces

## SubComponent Types

```typescript
type SelectSubComponent =
  // Basic Types
  | 'basic'          // Standard single select
  | 'multiple'       // Multiple selection
  | 'combobox'       // Searchable select
  
  // Advanced Selection Types
  | 'cascading'      // Hierarchical selection
  | 'grouped'        // Options with groups
  | 'virtualized'    // Performance-optimized for large lists
  | 'async'          // Async data loading
  
  // Specialized Types
  | 'tags'           // Tag-style multiple select with creation
  | 'split'          // Split button with default + options
  | 'tree'           // Tree-style hierarchical select
  | 'transfer'       // Two-column transfer selection
  
  // Command Types
  | 'command'        // Command palette style
  | 'contextual'     // Context-aware options
  | 'searchable'     // Enhanced search capabilities;

## Type Definitions

```typescript
// Base option type
interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
  meta?: Record<string, any>;
}

// Group type for grouped options
interface OptionGroup {
  label: string;
  options: SelectOption[];
  disabled?: boolean;
}

// Hierarchical option for tree/cascading
interface HierarchicalOption extends SelectOption {
  children?: HierarchicalOption[];
  expanded?: boolean;
}

// Base Props Interface
interface SelectBaseProps {
  // Core props
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  
  // Options configuration
  options: SelectOption[] | OptionGroup[] | HierarchicalOption[];
  
  // Behavior
  behavior?: {
    closeOnSelect?: boolean;
    searchable?: boolean;
    creatable?: boolean;
    clearable?: boolean;
    loading?: boolean;
    virtualized?: boolean;
    async?: boolean;
  };
  
  // Search/Filter
  search?: {
    debounce?: number;
    minLength?: number;
    placeholder?: string;
    ignoreCase?: boolean;
    matchFrom?: 'start' | 'any' | 'word';
    keys?: string[];  // For searching multiple fields
  };
  
  // Visual
  visual?: {
    placement?: 'top' | 'bottom';
    maxHeight?: string;
    width?: string | 'auto' | 'trigger';
    showCheckmarks?: boolean;
    showIcons?: boolean;
    truncate?: boolean;
  };
  
  // Validation
  validation?: {
    required?: boolean;
    min?: number;  // For multiple select
    max?: number;  // For multiple select
    custom?: (value: any) => boolean;
  };
}

// Specialized Props
interface ComboboxProps extends SelectBaseProps {
  creatable?: {
    formatCreate?: (query: string) => string;
    validate?: (value: string) => boolean;
    onCreate?: (value: string) => void;
  };
}

interface CascadingProps extends SelectBaseProps {
  cascade?: {
    separator?: string;
    expandTrigger?: 'hover' | 'click';
    changeOnSelect?: boolean;
    loadData?: (option: HierarchicalOption) => Promise<HierarchicalOption[]>;
  };
}

interface TransferProps extends SelectBaseProps {
  transfer?: {
    titles?: [string, string];
    operations?: string[];
    filterable?: boolean;
    pagination?: boolean;
    itemsPerPage?: number;
  };
}

interface CommandProps extends SelectBaseProps {
  command?: {
    shortcut?: string;
    category?: string;
    keywords?: string[];
    action?: () => void;
  };
}
```

## Implementation Example

```typescript
const EntitySelect: React.FC<EntityCommonProps> = (props) => {
  const {
    value,
    onChange,
    componentProps,
    name,
    displayName,
    description
  } = props;

  // Transform options based on format provided
  const transformOptions = (options: any[]): SelectOption[] => {
    if (!Array.isArray(options)) return [];
    
    return options.map(opt => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      if (typeof opt === 'object') {
        return {
          value: opt.value || opt.id || opt,
          label: opt.label || opt.name || opt.toString(),
          disabled: opt.disabled,
          icon: opt.icon,
          description: opt.description
        };
      }
      return { value: String(opt), label: String(opt) };
    });
  };

  // Get configuration based on subComponent
  const getSelectConfig = () => {
    switch (componentProps.subComponent) {
      case 'combobox':
        return {
          searchable: true,
          creatable: componentProps.creatable !== 'false',
          closeOnSelect: true,
          behavior: {
            debounce: 300,
            minLength: 1
          }
        };
      
      case 'cascading':
        return {
          cascade: {
            expandTrigger: 'click',
            changeOnSelect: false,
            separator: ' / '
          }
        };
      
      case 'multiple':
        return {
          multiple: true,
          closeOnSelect: false,
          showCheckmarks: true
        };
      
      // Add cases for other types
    }
  };

  // Transform system props to component props
  const transformedProps = {
    value,
    onChange,
    options: transformOptions(componentProps.options),
    ...getSelectConfig(),
    className: generateClassName(componentProps),
    'aria-label': displayName,
    'aria-description': description,
  };

  // Render appropriate component
  switch (componentProps.subComponent) {
    case 'combobox':
      return <MatrxCombobox {...transformedProps} />;
    
    case 'cascading':
      return <MatrxCascadingSelect {...transformedProps} />;
    
    case 'transfer':
      return <MatrxTransferSelect {...transformedProps} />;
    
    case 'tree':
      return <MatrxTreeSelect {...transformedProps} />;
    
    case 'command':
      return <MatrxCommandSelect {...transformedProps} />;
    
    default:
      return <MatrxBaseSelect {...transformedProps} />;
  }
};
```

## Schema Examples

```typescript
// Basic Select
{
  defaultComponent: 'select',
  componentProps: {
    subComponent: 'basic',
    options: [
      { value: '1', label: 'Option 1' },
      { value: '2', label: 'Option 2' }
    ],
    variant: 'outline'
  }
}

// Grouped Combobox
{
  defaultComponent: 'select',
  componentProps: {
    subComponent: 'combobox',
    options: [
      {
        label: 'Group 1',
        options: [
          { value: '1', label: 'Option 1' },
          { value: '2', label: 'Option 2' }
        ]
      }
    ],
    behavior: {
      searchable: true,
      creatable: true
    },
    search: {
      debounce: 300,
      minLength: 2
    }
  }
}

// Cascading Select
{
  defaultComponent: 'select',
  componentProps: {
    subComponent: 'cascading',
    options: [
      {
        value: 'electronics',
        label: 'Electronics',
        children: [
          {
            value: 'phones',
            label: 'Phones',
            children: [
              { value: 'iphone', label: 'iPhone' },
              { value: 'android', label: 'Android' }
            ]
          }
        ]
      }
    ],
    cascade: {
      expandTrigger: 'hover',
      changeOnSelect: true
    }
  }
}
```

Key features of this system:
1. Handles simple to complex selection scenarios
2. Supports various data structures
3. Provides consistent behavior across types
4. Includes accessibility features
5. Handles async and large data sets
6. Supports keyboard navigation
7. Maintains type safety
8. Provides flexible styling options

Would you like me to elaborate on any particular aspect or provide more implementation details for specific variants?
