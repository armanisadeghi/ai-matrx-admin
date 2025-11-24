# Monaco Editor Configuration

This directory contains configuration files for Monaco Editor, including type definitions for IntelliSense support.

## Files

### `monaco-config.ts`
Main configuration file that sets up Monaco Editor with TypeScript/JavaScript language services, compiler options, and loads type definitions.

### `type-definitions.ts`
Contains TypeScript declaration files (`.d.ts`) for commonly used libraries and components in Prompt Apps. This prevents IntelliSense errors when importing modules like `@/components/ui/*` or `lucide-react`.

## How It Works

When Monaco Editor loads code that imports external modules (e.g., `import { Button } from '@/components/ui/button'`), TypeScript's language service needs to know about these modules to provide IntelliSense and prevent errors.

We use `monaco.languages.typescript.typescriptDefaults.addExtraLib()` to inject TypeScript declaration files that define these modules.

## Current Type Definitions

The following modules are currently defined:

### React
- Core React types (`FC`, `ReactNode`, `ReactElement`)
- React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`, etc.)
- Event types (`FormEvent`, `ChangeEvent`, `MouseEvent`, `KeyboardEvent`)

### Lucide React Icons
- Common icon components (`Loader2`, `Sparkles`, `AlertCircle`, etc.)
- Icon props interface

### UI Components (`@/components/ui/*`)
- `Button` - with variants and sizes
- `Input` - text input component
- `Textarea` - multiline text input
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Label` - form label component
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`
- `Slider` - range slider component
- `Alert`, `AlertTitle`, `AlertDescription`
- `Badge` - badge/tag component
- `Checkbox` - checkbox input
- `Switch` - toggle switch
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, etc.
- `Tooltip`, `TooltipProvider`, `TooltipTrigger`, `TooltipContent`
- `DropdownMenu` and related components
- `Progress` - progress bar
- `Separator` - visual divider
- `RadioGroup`, `RadioGroupItem`

### Custom Components
- `EnhancedChatMarkdown` - markdown renderer for chat responses

## Adding New Type Definitions

To add support for a new library or component:

1. **Open `type-definitions.ts`**

2. **Add a new constant with the declaration:**

```typescript
export const myNewLibTypes = \`
declare module 'my-library' {
  import { FC } from 'react';

  export interface MyComponentProps {
    prop1: string;
    prop2?: number;
  }

  export const MyComponent: FC<MyComponentProps>;
}
\`;
```

3. **Add it to the `getAllTypeDefinitions()` function:**

```typescript
export const getAllTypeDefinitions = () => {
  return [
    { content: reactTypes, filePath: 'file:///node_modules/@types/react/index.d.ts' },
    { content: lucideReactTypes, filePath: 'file:///node_modules/@types/lucide-react/index.d.ts' },
    { content: uiComponentTypes, filePath: 'file:///node_modules/@types/ui-components/index.d.ts' },
    { content: customComponentTypes, filePath: 'file:///node_modules/@types/custom-components/index.d.ts' },
    { content: myNewLibTypes, filePath: 'file:///node_modules/@types/my-library/index.d.ts' }, // Add here
  ];
};
```

4. **Save the file**

5. **Bump the version in `monaco-config.ts`** to force cache refresh:
```typescript
const VERSION = 'v3'; // Increment this (v2 -> v3 -> v4, etc.)
```

6. **Hard refresh your browser** (`Ctrl+Shift+R` or `Cmd+Shift+R`) - Monaco will reload with the new definitions.

## Tips

- **Keep it simple**: You don't need to define every single prop or method. Focus on the most commonly used features.
- **Use generics sparingly**: Complex generic types can slow down IntelliSense. Use `any` or simple types when appropriate.
- **File paths**: The `filePath` parameter should be unique and follow the pattern `file:///node_modules/@types/[library-name]/index.d.ts`
- **Test it**: After adding new definitions, test them in the Monaco Test Page (`/demo/monaco-test`)

## Example: Adding a New UI Component

If you add a new UI component to `@/components/ui/my-component`, add its definition to `uiComponentTypes`:

```typescript
export const uiComponentTypes = \`
// ... existing definitions ...

declare module '@/components/ui/my-component' {
  import { FC, ReactNode } from 'react';

  export interface MyComponentProps {
    children?: ReactNode;
    variant?: 'default' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    onAction?: () => void;
  }

  export const MyComponent: FC<MyComponentProps>;
}
\`;
```

## Troubleshooting

### IntelliSense Still Shows Errors After Updating Type Definitions
1. **Bump the version** in `monaco-config.ts`: Change `const VERSION = 'v2'` to `'v3'`, `'v4'`, etc.
2. **Hard refresh** your browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. **Clear browser cache**: Open DevTools → Application → Clear Storage → Clear site data
4. Check that the module name in `declare module` matches exactly what you're importing
5. Check browser console for Monaco configuration errors

### Autocomplete Not Working
- Make sure the types are added to **both** `javascriptDefaults` and `typescriptDefaults`
- Verify that `monaco-config.ts` is calling `getAllTypeDefinitions()`
- Check that the language is set to `typescript` (not `javascript`) for TSX files

### Slow IntelliSense
- Simplify complex type definitions
- Remove unused type definitions
- Consider breaking large type definition strings into smaller modules

