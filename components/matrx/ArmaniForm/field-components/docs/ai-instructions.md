# Multi-Layer Component Architecture Guide

## Overview
Our component architecture consists of three distinct layers, each with specific responsibilities and constraints. This system enables maximum reusability while maintaining strict type safety and providing resilient data handling.

```
┌─── System Data Layer ───┐
│ Standardized Schema     │
│ Universal Props         │
│ Component Metadata      │
└──────────┬──────────────┘
           │
┌──────────▼────────────┐
│   Translator Layer    │
│ Data Transformation   │
│ Error Recovery        │
│ Props Normalization   │
└──────────┬────────────┘
           │
┌──────────▼────────────┐
│   Component Layer     │
│ Base Components       │
│ Enhanced Components   │
└───────────────────────┘
```

## For Component Consumers

Your schema only needs to specify:
1. `defaultComponent`: Identifies which translator to use
2. `subComponent`: Specifies which variant to render
3. Any additional configuration in `componentProps`

---

## Layer-Specific Guidelines

### Base Component Guidelines

1. **Purpose**
    - Fundamental building blocks
    - Single responsibility
    - Minimal, focused prop interfaces

2. **Requirements**
    - Clear, strict TypeScript interfaces
    - No assumptions about parent data
    - Document all required props
    - Provide sensible defaults for optional props

3. **Best Practices**
   ```typescript
   interface BaseComponentProps {
     // Required props - no defaults, must be provided
     value: T;
     onChange: (value: T) => void;
     
     // Optional props - always provide defaults
     className?: string;
     disabled?: boolean;
   }
   ```

### Enhanced Component Guidelines

1. **Purpose**
    - Add specialized functionality
    - Combine multiple base components
    - Provide preset configurations

2. **Requirements**
    - Build upon base component interfaces
    - Reduce rather than expand customization options
    - Handle complex interactions internally

3. **Best Practices**
   ```typescript
   interface EnhancedComponentProps extends Pick<BaseProps, 'value' | 'onChange'> {
     // Add only necessary new props
     variant?: 'simple' | 'advanced';
     
     // Avoid exposing internal complexity
     // BAD: innerComponentRef?: React.RefObject<HTMLElement>;
     // GOOD: onReady?: () => void;
   }
   ```

### Translator Component Guidelines

1. **Purpose**
    - Convert system schema to component props
    - Handle data validation and recovery
    - Provide intelligent defaults

2. **Requirements**
    - Accept standardized system props
    - Never pass unknown props to components
    - Implement thorough error handling
    - Convert system values to component-specific values

3. **Best Practices**
   ```typescript
   // 1. Define clear system prop interface
   interface SystemProps {
     value: any;
     onChange: (value: any) => void;
     componentProps: {
       subComponent: string;
       [key: string]: any;
     };
   }

   // 2. Implement robust data parsing
   const parseValue = (value: any): ValidType | undefined => {
     try {
       // Multiple parsing attempts
       // Type checking
       // Data recovery
     } catch {
       // Fallback to safe default
     }
   };

   // 3. Transform system props to component props
   const transformProps = (props: SystemProps): ComponentProps => {
     return {
       value: parseValue(props.value),
       variant: mapVariant(props.componentProps.variant),
       className: generateClassName(props)
     };
   };
   ```

4. **Error Handling Philosophy**
    - Fail fast on missing required props
    - Be extremely resilient with user data
    - Provide meaningful console warnings
    - Always render something valid

## Implementation Example

```typescript
// Translator Component
export const EntityTranslator: React.FC<SystemProps> = (props) => {
  // 1. Validate required props
  if (!props.componentProps.subComponent) {
    console.warn('Missing subComponent, falling back to default');
  }

  // 2. Transform system data
  const componentProps = transformProps(props);

  // 3. Select and render appropriate component
  switch (props.componentProps.subComponent) {
    case 'enhanced':
      return <EnhancedComponent {...componentProps} />;
    default:
      return <BaseComponent {...componentProps} />;
  }
};
```

## Best Practices

1. **Type Safety**
    - Use TypeScript interfaces for all props
    - Focus on good Types, but without things that cause unecessary errors
    - Define clear prop validation
    - Built components to be resilient so the Types don't have to be as tight.

2. **Error Handling**
    - Translators should handle all edge cases
    - Components should assume valid props
    - Provide meaningful error messages

3. **Performance**
    - Implement memoization where appropriate
    - Avoid unnecessary prop spreading
    - Cache transformed values

4. **Testing**
    - Test each layer independently
    - Verify error handling paths
    - Test with invalid data
