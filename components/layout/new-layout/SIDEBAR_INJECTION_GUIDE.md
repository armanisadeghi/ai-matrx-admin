# Sidebar Content Injection Guide

## Overview

The app-wide sidebar now supports route-specific content injection, similar to how the header works with `page-specific-header-content`. This eliminates the need for duplicate sidebar implementations in individual layouts.

## Sidebar Structure

The sidebar is organized into three main sections:

1. **Top Section** - Primary navigation links (fixed)
2. **Middle Section** - Route-specific content (scrollable, injected by pages)
3. **Bottom Section** - User settings and admin links (fixed)

## Usage

### Injecting Content into the Sidebar

Use the `useSidebarContent` hook to inject route-specific content:

```tsx
'use client';

import { useSidebarContent } from '@/hooks/useSidebarContent';
import { YourSidebarComponent } from './YourSidebarComponent';

export default function YourLayout({ children }) {
  // Inject your content into the main app sidebar
  const SidebarContent = useSidebarContent(() => <YourSidebarComponent />);

  return (
    <>
      {SidebarContent}
      <main>
        {children}
      </main>
    </>
  );
}
```

### Creating Sidebar Content Components

Your sidebar content component should:
- Be compact and work within the sidebar's width (256px expanded, 44px collapsed)
- Handle its own scrolling if needed (parent provides `overflow-y-auto`)
- Use small, clean UI elements that match the app theme
- Not worry about collapse state - the main sidebar handles that

Example:

```tsx
export const YourSidebarComponent = () => {
  return (
    <div className="h-full flex flex-col px-1">
      {/* Your content here */}
      <button className="w-full px-2 py-1.5 rounded-lg text-xs">
        Action Button
      </button>
      
      <div className="flex-1 overflow-y-auto">
        {/* Scrollable list */}
      </div>
    </div>
  );
};
```

## Example: Chat Sidebar

See `features/chat/components/conversations/ChatSidebarContent.tsx` for a complete example of:
- Compact search input
- Action button (New Chat)
- Scrollable list with grouping
- Hover menus on list items
- Load more functionality

## Benefits

1. **No Duplication** - Single sidebar implementation across the app
2. **Consistent UX** - Users always see main nav links with route-specific content below
3. **Better Space Usage** - No need for separate left panels in layouts
4. **Cleaner Code** - Route-specific content is clearly separated and injected
5. **Flexible** - Each route can have completely different sidebar content

## Technical Details

### Portal Injection
The `useSidebarContent` hook uses React portals to inject content into `#page-specific-sidebar-content` div in the main sidebar.

### Sidebar Layout Structure
```
┌─────────────────────┐
│ Primary Nav Links   │ ← Fixed
├─────────────────────┤
│                     │
│ Route-Specific      │ ← Injected (scrollable)
│ Content Area        │
│                     │
├─────────────────────┤
│ Admin Links (if on) │ ← Fixed (conditional)
├─────────────────────┤
│ User Settings       │ ← Fixed
└─────────────────────┘
```

## Migration

If you have existing layouts with separate sidebars:
1. Create a dedicated sidebar content component
2. Use `useSidebarContent` to inject it
3. Remove the separate `leftPanel` from `AdaptiveLayout`
4. The main content will automatically take full width

