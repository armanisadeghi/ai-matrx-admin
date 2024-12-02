Let's create a more sophisticated version of the utility that can handle your dynamic styling needs. This approach will make your styling more maintainable and consistent across your application.



```typescript
import type { ClassValue } from "clsx";
import clsx from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Define common configuration types
type Density = 'compact' | 'normal' | 'comfortable';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Variant = 'default' | 'primary' | 'secondary' | 'destructive' | 'success' | 'outline' | 'ghost' | 'link';
type InteractionLevel = 'none' | 'subtle' | 'medium' | 'high';

// Configuration for different density levels
const densityConfig = {
  compact: {
    padding: { x: 'px-2', y: 'py-1' },
    spacing: 'gap-1',
    text: 'text-sm',
    height: 'h-8'
  },
  normal: {
    padding: { x: 'px-3', y: 'py-2' },
    spacing: 'gap-2',
    text: 'text-base',
    height: 'h-10'
  },
  comfortable: {
    padding: { x: 'px-4', y: 'py-3' },
    spacing: 'gap-3',
    text: 'text-lg',
    height: 'h-12'
  }
};

// Configuration for different variants
const variantConfig = {
  default: 'bg-background border-input hover:bg-accent/50',
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  success: 'bg-success text-success-foreground hover:bg-success/90',
  outline: 'border-2 hover:bg-accent/50',
  ghost: 'hover:bg-accent/50',
  link: 'text-primary underline-offset-4 hover:underline'
};

// Configuration for interaction levels
const interactionConfig = {
  none: {
    hover: '',
    active: '',
    focus: ''
  },
  subtle: {
    hover: 'hover:brightness-95',
    active: 'active:brightness-90',
    focus: 'focus:ring-1'
  },
  medium: {
    hover: 'hover:brightness-90 hover:scale-[0.98]',
    active: 'active:brightness-85 active:scale-[0.97]',
    focus: 'focus:ring-2'
  },
  high: {
    hover: 'hover:brightness-85 hover:scale-[0.97] hover:shadow-md',
    active: 'active:brightness-80 active:scale-[0.96]',
    focus: 'focus:ring-2 focus:ring-offset-2'
  }
};

// Extended configuration for the tailwind-merge utility
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['xs', 'sm', 'base', 'lg', 'xl'] }],
      spacing: ['gap'],
      padding: ['px', 'py'],
      height: ['h'],
      'interaction-level': Object.values(interactionConfig).flatMap(level => 
        Object.values(level)
      ),
    },
  },
});

interface StyleOptions {
  density?: Density;
  variant?: Variant;
  interactionLevel?: InteractionLevel;
  disabled?: boolean;
  className?: string;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDynamicStyles({
  density = 'normal',
  variant = 'default',
  interactionLevel = 'medium',
  disabled = false,
  className = ''
}: StyleOptions = {}) {
  const densityClasses = densityConfig[density];
  const variantClasses = variantConfig[variant];
  const interactionClasses = interactionConfig[interactionLevel];

  const baseClasses = cn(
    // Density-based classes
    densityClasses.padding.x,
    densityClasses.padding.y,
    densityClasses.spacing,
    densityClasses.text,
    densityClasses.height,

    // Variant classes
    variantClasses,

    // Interaction classes (only if not disabled)
    !disabled && [
      interactionClasses.hover,
      interactionClasses.active,
      interactionClasses.focus,
    ],

    // Disabled state
    disabled && 'opacity-50 cursor-not-allowed',

    // Custom classes
    className
  );

  return baseClasses;
}

```

This utility provides several key benefits:

1. **Consistent Styling**: All density, variant, and interaction configurations are defined in one place
2. **Type Safety**: TypeScript interfaces ensure proper usage
3. **Easy to Extend**: New variants, densities, or interaction levels can be added to the configs
4. **Flexible**: Can be used with any component

Here's how you could use it in your components:

```tsx
import { getDynamicStyles } from '@/utils/styles';

const MyComponent = ({ 
  density = 'normal',
  variant = 'default',
  disabled = false,
  className
}) => {
  const styles = getDynamicStyles({
    density,
    variant,
    interactionLevel: 'medium',
    disabled,
    className
  });

  return (
    <div className={styles}>
      Content
    </div>
  );
};
```

You could even create more specific utilities for different types of components:

```tsx
const getButtonStyles = ({ size = 'md', ...options }: StyleOptions & { size?: Size }) => {
  return getDynamicStyles({
    ...options,
    className: cn(
      'rounded-md font-medium',
      size === 'xs' && 'text-xs',
      size === 'sm' && 'text-sm',
      size === 'md' && 'text-base',
      size === 'lg' && 'text-lg',
      size === 'xl' && 'text-xl',
      options.className
    )
  });
};
```

We can definitely combine this into a single configuration object and export it as `cn`. This approach could work well with a context-based configuration that flows through your app. Here's how we could modify it:



```typescript
import type { ClassValue } from "clsx";
import clsx from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Define the global configuration type
export interface ThemeConfig {
  density: 'compact' | 'normal' | 'comfortable';
  variant: 'default' | 'primary' | 'secondary' | 'destructive' | 'success' | 'outline' | 'ghost' | 'link';
  interactionLevel: 'none' | 'subtle' | 'medium' | 'high';
  disabled?: boolean;
}

// Default configuration
const defaultConfig: ThemeConfig = {
  density: 'normal',
  variant: 'default',
  interactionLevel: 'medium',
  disabled: false
};

// Configuration maps
const densityConfig = {
  compact: {
    padding: { x: 'px-2', y: 'py-1' },
    spacing: 'gap-1',
    text: 'text-sm',
    height: 'h-8'
  },
  normal: {
    padding: { x: 'px-3', y: 'py-2' },
    spacing: 'gap-2',
    text: 'text-base',
    height: 'h-10'
  },
  comfortable: {
    padding: { x: 'px-4', y: 'py-3' },
    spacing: 'gap-3',
    text: 'text-lg',
    height: 'h-12'
  }
};

const variantConfig = {
  default: 'bg-background border-input hover:bg-accent/50',
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  success: 'bg-success text-success-foreground hover:bg-success/90',
  outline: 'border-2 hover:bg-accent/50',
  ghost: 'hover:bg-accent/50',
  link: 'text-primary underline-offset-4 hover:underline'
};

const interactionConfig = {
  none: {
    hover: '',
    active: '',
    focus: ''
  },
  subtle: {
    hover: 'hover:brightness-95',
    active: 'active:brightness-90',
    focus: 'focus:ring-1'
  },
  medium: {
    hover: 'hover:brightness-90 hover:scale-[0.98]',
    active: 'active:brightness-85 active:scale-[0.97]',
    focus: 'focus:ring-2'
  },
  high: {
    hover: 'hover:brightness-85 hover:scale-[0.97] hover:shadow-md',
    active: 'active:brightness-80 active:scale-[0.96]',
    focus: 'focus:ring-2 focus:ring-offset-2'
  }
};

// Global configuration store
let globalConfig = { ...defaultConfig };

// Function to set global configuration
export const setThemeConfig = (config: Partial<ThemeConfig>) => {
  globalConfig = { ...globalConfig, ...config };
};

// Extended tailwind-merge configuration
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['xs', 'sm', 'base', 'lg', 'xl'] }],
      spacing: ['gap'],
      padding: ['px', 'py'],
      height: ['h']
    },
  },
});

// Main cn function that applies both global config and local classes
export const cn = (...inputs: ClassValue[]) => {
  const { density, variant, interactionLevel, disabled } = globalConfig;
  
  // Get the configuration-based classes
  const configClasses = [
    // Density classes
    densityConfig[density].padding.x,
    densityConfig[density].padding.y,
    densityConfig[density].spacing,
    densityConfig[density].text,
    densityConfig[density].height,

    // Variant classes
    variantConfig[variant],

    // Interaction classes (only if not disabled)
    !disabled && [
      interactionConfig[interactionLevel].hover,
      interactionConfig[interactionLevel].active,
      interactionConfig[interactionLevel].focus,
    ],

    // Disabled state
    disabled && 'opacity-50 cursor-not-allowed',
  ];

  // Combine configuration classes with provided inputs
  return twMerge(clsx(configClasses, ...inputs));
};

```

Now you can use it like this:

```tsx
// In your app's root or configuration layer:
import { setThemeConfig } from '@/utils/cn';

// Set global configuration
setThemeConfig({
  density: 'comfortable',
  variant: 'primary',
  interactionLevel: 'medium'
});

// In your components:
import { cn } from '@/utils/cn';

const MyComponent = ({ className }) => {
  return (
    <div className={cn(
      "rounded-md", // Base classes
      "hover:bg-blue-500", // These will be merged with the global config
      className // Allow overrides
    )}>
      Content
    </div>
  );
};
```

You could also use React Context to make this even more flexible:

```tsx
// themeContext.tsx
import { createContext, useContext } from 'react';
import { ThemeConfig } from '@/utils/cn';

const ThemeContext = createContext<ThemeConfig>(defaultConfig);

export const ThemeProvider = ({ config, children }) => {
  return (
    <ThemeContext.Provider value={config}>
      {children}
    </ThemeContext.Provider>
  );
};

// App.tsx
<ThemeProvider config={{
  density: 'comfortable',
  variant: 'primary',
  interactionLevel: 'medium'
}}>
  <App />
</ThemeProvider>
```

This approach gives you:
1. Global configuration that can be set once and used everywhere
2. The ability to override the global config at any level
3. Type safety for your configuration
4. Consistent styling across your application
5. The familiar `cn` function interface

The only potential issue to watch for is that the global configuration will affect all components using the `cn` function. If you need different configurations for different parts of your app, you might want to use the Context approach instead of the global configuration.

Would you like me to adjust any part of this setup or add additional features?
