---

# **Matrx Design System**

## **Core Configuration**

### **Component Props**
```typescript
interface BaseMatrxProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  density?: 'compact' | 'normal' | 'comfortable';
  variant?: 'default' | 'primary' | 'secondary' | 'destructive' | 'ghost' | 'link';
  animation?: 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful';
  state?: 'idle' | 'loading' | 'success' | 'error' | 'disabled';
}
```

### **Density Impact**

| **Density**   | **Usage**             | **Height (md)** | **Padding (md)** | **Font**   | **Spacing**  |
|---------------|-----------------------|-----------------|------------------|------------|--------------|
| compact       | Dense UIs, tables     | h-9             | px-3 py-1.5      | text-sm    | space-y-2    |
| normal        | General interfaces    | h-10            | px-4 py-2        | text-base  | space-y-4    |
| comfortable   | Forms, editing views  | h-11            | px-5 py-2.5      | text-lg    | space-y-6    |

---

### **Animation Presets**

| **Preset**    | **Effect**             | **Use Case**                |
|---------------|------------------------|-----------------------------|
| none          | No animation           | Performance-critical UIs    |
| subtle        | Fade + small shift     | General UI, forms           |
| smooth        | Fade + scale           | Modals, cards               |
| energetic     | Scale + bounce         | CTAs, confirmations         |
| playful       | Rotation + scale       | Celebrations, feedback      |

---

## **JSON Viewer Specific**

### **Additional Configuration**
```typescript
interface JsonViewerConfig {
  arrayThreshold: number;    // Max items before collapse
  truncateThreshold: number; // Max entries before truncate
  indentSize: string;        // Tailwind padding class
}
```

### **Quick Usage**

#### **Basic Component**
```typescript
<MatrxComponent
  size="md"
  density="normal"
  variant="primary"
  animation="smooth"
/>
```

#### **JSON Viewer**
```typescript
<MatrxJsonViewer
  data={jsonData}
  size="md"
  density="normal"
  variant="default"
  maxHeight="500px"
  initialExpanded={false}  // JSON-specific props
  hideControls={false}
/>
```

---

## **Component Customization Pattern**
```typescript
const MyComponent = ({
  size = 'md',
  density = 'normal',
  variant = 'default',
  animation = 'subtle',
  customProp,  // Component-specific props
  ...props     // Spread base props first
}) => {
  const densityStyles = densityConfig[density];

  return (
    <div
      className={cn(
        getComponentStyles({ size, density, variant }), // Base styles
        densityStyles.spacing,                         // Density-specific styles
        customStyles                                   // Custom styles
      )}
    >
      {/* Content */}
    </div>
  );
};
```

---

## **Best Practices**

1. **Density Consistency**
    - Maintain the same density across related components.
    - Align density with the content's visual density.

2. **Animation Selection**
    - Use `'subtle'` for standard interactions.
    - Apply `'energetic'` or `'playful'` animations sparingly for special effects.

3. **State Management**
    - Prefer controlled state management via props.
    - Use internal state for UI-only features when necessary.

4. **Style Layering**
    - Apply styles in the following order:
        - Base styles → Density styles → Variant styles → Custom styles.

5. **Performance**
    - Use `'none'` for animations in list-heavy UIs.
    - Consider disabling animations for dense data-heavy interfaces.

---
