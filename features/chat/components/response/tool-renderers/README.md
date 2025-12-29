# Tool Renderers System

A registry-based system for creating custom displays for MCP tool results. This makes it easy to add beautiful, tool-specific visualizations one at a time without touching core orchestration code.

## Architecture

Each tool can provide two types of renderers:

1. **Inline Renderer** (Required) - Compact display shown directly in the chat stream
2. **Overlay Renderer** (Optional) - Enhanced display shown in the full-screen modal

If no overlay renderer is provided, the system falls back to the inline renderer. If neither exists, a generic fallback displays user messages or minimal status.

## Quick Start

### Adding a New Tool Renderer

Let's say you want to add a custom display for a tool called `weather_api`:

#### 1. Create the Directory Structure

```
features/chat/components/response/tool-renderers/
└── weather-api/
    ├── WeatherInline.tsx
    ├── WeatherOverlay.tsx (optional)
    └── index.ts
```

#### 2. Create the Inline Component

```tsx
// weather-api/WeatherInline.tsx
"use client";

import React from "react";
import { ToolRendererProps } from "../types";

export const WeatherInline: React.FC<ToolRendererProps> = ({ 
    toolUpdates, 
    currentIndex,
    onOpenOverlay 
}) => {
    // Extract weather data from tool updates
    const outputUpdate = toolUpdates.find(u => u.type === "mcp_output");
    const weatherData = outputUpdate?.mcp_output?.result;
    
    if (!weatherData) return null;
    
    return (
        <div className="space-y-2">
            <div className="text-xs text-slate-600 dark:text-slate-400">
                Weather: {weatherData.temp}°F, {weatherData.condition}
            </div>
            
            {/* Optional: Button to open detailed view */}
            {onOpenOverlay && (
                <button 
                    onClick={() => onOpenOverlay()}
                    className="text-xs text-blue-600 hover:text-blue-800"
                >
                    View detailed forecast
                </button>
            )}
        </div>
    );
};
```

#### 3. Create the Overlay Component (Optional)

```tsx
// weather-api/WeatherOverlay.tsx
"use client";

import React from "react";
import { ToolRendererProps } from "../types";

export const WeatherOverlay: React.FC<ToolRendererProps> = ({ toolUpdates }) => {
    const outputUpdate = toolUpdates.find(u => u.type === "mcp_output");
    const weatherData = outputUpdate?.mcp_output?.result;
    
    // Full detailed weather display with charts, hourly forecast, etc.
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">7-Day Forecast</h1>
            {/* Your enhanced display here */}
        </div>
    );
};
```

#### 4. Create the Barrel Export

```tsx
// weather-api/index.ts
export { WeatherInline } from "./WeatherInline";
export { WeatherOverlay } from "./WeatherOverlay";
```

#### 5. Register the Tool

```tsx
// registry.tsx
import { WeatherInline, WeatherOverlay } from "./weather-api";

export const toolRendererRegistry: ToolRegistry = {
    // ... existing tools
    
    "weather_api": {
        inline: WeatherInline,
        overlay: WeatherOverlay, // Optional
    },
};
```

#### 6. Export from Index (if needed)

```tsx
// index.ts
export * from "./weather-api";
```

That's it! Your tool now has a custom display. 🎉

## Component Props

### ToolRendererProps

```typescript
interface ToolRendererProps {
    /**
     * Array of all tool updates for this tool call
     * Includes mcp_input, step_data, mcp_output, etc.
     */
    toolUpdates: ToolCallObject[];
    
    /**
     * Current index in the tool updates array being rendered
     * Useful for progressive rendering
     */
    currentIndex?: number;
    
    /**
     * Callback to open the overlay modal
     * @param initialTab - Optional tab ID to open initially
     */
    onOpenOverlay?: (initialTab?: string) => void;
}
```

### Accessing Tool Data

```tsx
// Get tool input arguments
const inputUpdate = toolUpdates.find(u => u.type === "mcp_input");
const args = inputUpdate?.mcp_input?.arguments;

// Get tool output
const outputUpdate = toolUpdates.find(u => u.type === "mcp_output");
const result = outputUpdate?.mcp_output?.result;

// Get step data (for streaming updates)
const stepUpdates = toolUpdates.filter(u => u.type === "step_data");

// Get user visible messages
const messages = toolUpdates
    .filter(u => u.user_visible_message)
    .map(u => u.user_visible_message);
```

## Design Guidelines

### Inline Renderers

- **Keep it compact** - Show only the most important information
- **Use progressive disclosure** - Show 3-6 items, then "+X more" button
- **Be responsive** - Use grid layouts that collapse on mobile
- **Handle loading states** - Show skeleton/spinner while data arrives
- **Graceful degradation** - Handle missing images/data elegantly

### Overlay Renderers

- **Go full-featured** - Charts, filters, sorting, detailed views
- **Organize with tabs/sections** - Group related information
- **Enable interactions** - Filtering, sorting, searching
- **Provide context** - Headers, descriptions, metadata
- **Export options** - Copy, save, share functionality (if relevant)

## Examples

### Current Implementations

1. **Brave Search** (`brave_search`)
   - Inline: Compact 5-site view with favicons
   - Overlay: Full tabbed interface (Overview, Web Results, Videos, By Domain, Saved Sources)

2. **News API** (`news_api`)
   - Inline: Responsive grid of 6 article cards with images
   - Overlay: Full scrollable list with filtering by source and sorting

3. **Generic Fallback**
   - Inline: User visible messages only
   - Overlay: Same as inline or JSON dump for debugging

## Best Practices

### 1. Progressive Rendering

Use the `currentIndex` prop to show updates as they arrive:

```tsx
const visibleUpdates = currentIndex !== undefined 
    ? toolUpdates.slice(0, currentIndex + 1) 
    : toolUpdates;
```

### 2. Error Handling

Always handle missing or malformed data:

```tsx
if (!data || !data.results || data.results.length === 0) {
    return (
        <div className="text-xs text-slate-500">
            No results available
        </div>
    );
}
```

### 3. Loading States

For streaming tools, show progress:

```tsx
const isComplete = toolUpdates.some(u => u.type === "mcp_output");

if (!isComplete) {
    return <Spinner />;
}
```

### 4. Dark Mode

Always provide dark mode styles:

```tsx
<div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
```

### 5. Accessibility

- Use semantic HTML
- Provide alt text for images
- Use ARIA labels where appropriate
- Ensure keyboard navigation works

## Tool Identification

Tools are identified by the `mcp_input.name` field:

```json
{
    "type": "mcp_input",
    "mcp_input": {
        "name": "weather_api",  // This is the tool identifier
        "arguments": { ... }
    }
}
```

## Debugging

### Check if Tool is Registered

```tsx
import { hasCustomRenderer } from "./registry";

console.log(hasCustomRenderer("my_tool")); // true/false
```

### View Raw Tool Data

If your custom renderer isn't showing, check the raw data in the generic fallback (it shows JSON).

### Common Issues

1. **Tool name mismatch** - Ensure registry key matches `mcp_input.name`
2. **Missing data** - Check that the expected fields exist in the tool output
3. **Import errors** - Ensure barrel exports are set up correctly
4. **Styling issues** - Check Tailwind classes and dark mode variants

## Migration from Old System

The old system used `step_data.type` for matching. The new system uses `mcp_input.name`:

**Old:**
```tsx
if (update.step_data?.type === "brave_default_page") {
    // hardcoded rendering
}
```

**New:**
```tsx
// In registry.tsx
"brave_search": {
    inline: BraveSearchInline,
    overlay: BraveSearchOverlay,
}
```

## Future Enhancements

Potential additions to this system:

- Renderer configuration options (themes, sizes, etc.)
- Shared utility components for common patterns
- Tool-specific hooks for data processing
- Automatic documentation generation
- Type-safe tool data interfaces
- Testing utilities for renderers

## Need Help?

- Check existing implementations: `brave-search/` and `news-api/`
- Review the `types.ts` file for complete type definitions
- Look at `GenericRenderer.tsx` for the simplest example
- Ensure your tool's `mcp_input.name` matches your registry key

