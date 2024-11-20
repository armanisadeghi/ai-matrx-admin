# Unified Input System

## Two Entry Points

1. **EntityInput**: Single-line input handling
2. **EntityTextarea**: Multi-line input handling

## Complete SubComponent Types

```typescript
type InputSubComponent =
  // Basic Input Types
  | 'basic'
  | 'numeric'
  | 'search'
  | 'tags'
  | 'masked'
  
  // Validated Input Types
  | 'email'
  | 'url'
  | 'phone'
  | 'password'
  | 'username'
  
  // Specialized Number Types
  | 'currency'
  | 'percentage'
  | 'integer'
  | 'decimal'
  
  // Format-Specific Types
  | 'ipAddress'
  | 'creditCard'
  | 'postalCode'
  | 'socialSecurity'
  
  // Advanced Types
  | 'combobox'      // Input with autocomplete
  | 'typeahead'     // Predictive input
  | 'mention'       // @mention style input
  | 'verification'  // PIN/verification code input;

type TextareaSubComponent =
  // Basic Types
  | 'basic'
  | 'autosize'
  | 'counter'
  | 'code'
  | 'markdown'
  
  // Specialized Types
  | 'json'          // JSON editor with validation
  | 'yaml'          // YAML editor with validation
  | 'html'          // HTML editor with preview
  | 'sql'           // SQL query editor
  
  // Advanced Types
  | 'diff'          // Diff viewer/editor
  | 'log'           // Log file viewer with syntax
  | 'csv'           // CSV editor with grid preview
  | 'template'      // Template editor with variable highlighting
```

## Enhanced Component Props Interface

```typescript
interface InputBaseProps {
  // Core props
  value: string;
  onChange: (value: string) => void;
  
  // Validation
  validation?: {
    pattern?: string | RegExp;
    custom?: (value: string) => boolean;
    messages?: {
      pattern?: string;
      custom?: string;
    };
  };
  
  // Formatting
  format?: {
    prefix?: string;
    suffix?: string;
    mask?: string;
    transform?: 'uppercase' | 'lowercase' | 'capitalize';
    normalize?: (value: string) => string;
  };
  
  // Behavior
  behavior?: {
    debounce?: number;
    throttle?: number;
    autoComplete?: boolean;
    autoCapitalize?: boolean;
    autoCorrect?: boolean;
    spellCheck?: boolean;
  };
  
  // Visual
  visual?: {
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    clearable?: boolean;
    loading?: boolean;
  };
}

// Specific props for different types
interface NumericInputProps extends InputBaseProps {
  numeric?: {
    decimals?: number;
    min?: number;
    max?: number;
    step?: number;
    thousandsSeparator?: string;
    decimalSeparator?: string;
  };
}

interface MaskInputProps extends InputBaseProps {
  mask?: {
    pattern: string;
    definitions?: Record<string, RegExp>;
    placeholder?: string;
  };
}

interface TextareaBaseProps {
  value: string;
  onChange: (value: string) => void;
  
  // Sizing
  sizing?: {
    minHeight?: string;
    maxHeight?: string;
    autosize?: boolean;
  };
  
  // Features
  features?: {
    lineNumbers?: boolean;
    wordWrap?: boolean;
    highlightLines?: number[];
    foldable?: boolean;
  };
  
  // Editor
  editor?: {
    language?: string;
    theme?: string;
    tabSize?: number;
    insertSpaces?: boolean;
  };
}
```

## Implementation Example

```typescript
const EntityInput: React.FC<EntityCommonProps> = (props) => {
  const {
    value,
    onChange,
    componentProps,
    name,
    displayName,
    description
  } = props;

  // Determine input type and validation based on subComponent
  const getInputConfig = () => {
    switch (componentProps.subComponent) {
      case 'email':
        return {
          type: 'email',
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          errorMessage: 'Please enter a valid email address'
        };
      
      case 'phone':
        return {
          mask: '(999) 999-9999',
          type: 'tel',
          pattern: /^\(\d{3}\) \d{3}-\d{4}$/,
          errorMessage: 'Please enter a valid phone number'
        };
      
      case 'currency':
        return {
          type: 'text',
          prefix: '$',
          decimals: 2,
          thousandsSeparator: ',',
          normalize: (value: string) => {
            // Currency normalization logic
          }
        };
      
      // Add cases for other types
    }
  };

  // Transform system props to component props
  const transformedProps = {
    value,
    onChange,
    ...getInputConfig(),
    className: generateClassName(componentProps),
    'aria-label': displayName,
    'aria-description': description,
  };

  // Render appropriate component
  switch (componentProps.subComponent) {
    case 'numeric':
    case 'currency':
    case 'percentage':
      return <MatrxNumericInput {...transformedProps} />;
    
    case 'phone':
    case 'creditCard':
    case 'postalCode':
      return <MatrxMaskedInput {...transformedProps} />;
    
    // Add cases for other specialized components
    
    default:
      return <MatrxBaseInput {...transformedProps} />;
  }
};
```

## Schema Examples

```typescript
// Email Input
{
  defaultComponent: 'input',
  componentProps: {
    subComponent: 'email',
    variant: 'outline',
    behavior: {
      autoComplete: 'email',
      autoCapitalize: false
    }
  }
}

// Phone Input
{
  defaultComponent: 'input',
  componentProps: {
    subComponent: 'phone',
    variant: 'outline',
    format: {
      mask: '(999) 999-9999',
      prefix: '+1'
    }
  }
}

// Currency Input
{
  defaultComponent: 'input',
  componentProps: {
    subComponent: 'currency',
    variant: 'outline',
    numeric: {
      decimals: 2,
      min: 0,
      thousandsSeparator: ',',
      decimalSeparator: '.'
    },
    format: {
      prefix: '$'
    }
  }
}
```

This unified approach:
1. Reduces duplication
2. Provides consistent behavior across all input types
3. Maintains type safety
4. Makes adding new input types straightforward
5. Keeps the core components simple while handling complexity in the translator layer

Would you like me to elaborate on any particular aspect or provide more detailed examples?
