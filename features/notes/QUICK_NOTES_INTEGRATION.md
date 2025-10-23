# Quick Notes Integration Guide

## Overview

The **Quick Notes** feature provides a floating sheet accessible from anywhere in your app. Perfect for quickly capturing thoughts, retrieving information, or jotting down notes without losing context.

## Features

✨ **Always Accessible** - Icon in header for instant access  
💾 **Auto-Save** - Never lose data, saves on close  
⚡ **Fast Switching** - Dropdown selector to switch between notes  
📁 **Folder Organization** - Shows notes grouped by folder  
🎯 **Compact UI** - No sidebar, optimized for sheet mode  
🔄 **Real-time Sync** - Changes save automatically

## Installation

### 1. Import the Component

```typescript
import { QuickNotesButton } from '@/features/notes';
```

### 2. Add to Your Header

#### Desktop Layout Example

**File**: `components/layout/new-layout/DesktopLayout.tsx`

```typescript
import { QuickNotesButton } from '@/features/notes';

// In the header section, add between notifications and theme switcher:
<div className="flex items-center gap-1">
    <NotificationDropdown {...notificationProps} />
    
    {/* Add Quick Notes Button */}
    <QuickNotesButton className="hover:bg-zinc-200 dark:hover:bg-zinc-700" />
    
    <ThemeSwitcherIcon {...themeProps} />
    <NavigationMenu />
</div>
```

#### Mobile Layout Example

**File**: `components/layout/new-layout/MobileLayout.tsx`

```typescript
import { QuickNotesButton } from '@/features/notes';

// In the header right side actions:
<div className="flex items-center gap-2">
    <NotificationDropdown {...notificationProps} />
    
    {/* Add Quick Notes Button */}
    <QuickNotesButton />
    
    <ThemeSwitcherIcon {...themeProps} />
    <NavigationMenu />
</div>
```

#### Any Custom Header

```typescript
import { QuickNotesButton } from '@/features/notes';

function MyHeader() {
    return (
        <header className="flex items-center justify-between">
            {/* Your content */}
            
            <div className="flex items-center gap-2">
                {/* Other header icons */}
                <QuickNotesButton />
            </div>
        </header>
    );
}
```

## User Experience

### Opening Quick Notes
1. User clicks the sticky note icon in header
2. Floating sheet slides in from right
3. Shows compact note selector + editor
4. Ready to capture/retrieve information

### Quick Capture Flow
1. User has an idea while working
2. Clicks sticky note icon
3. Pastes/types content
4. Closes sheet (auto-saves)
5. Back to work - no data lost

### Quick Retrieval Flow
1. User needs information from notes
2. Clicks sticky note icon
3. Selects note from dropdown
4. Copies what they need
5. Closes and continues working

## Component Props

### QuickNotesButton

```typescript
interface QuickNotesButtonProps {
    className?: string; // Optional styling
}
```

**Usage**:
```typescript
<QuickNotesButton className="hover:bg-zinc-100" />
```

## Sheet Configuration

The FloatingSheet is configured for optimal quick access:

- **Position**: Right side
- **Width**: XL (enough for comfortable editing)
- **Height**: Full (maximum editor space)
- **Close on Backdrop**: Yes
- **Close on ESC**: Yes
- **Auto-save on Close**: Yes (via auto-save hook)

## Auto-Save Behavior

- **Debounced**: 1 second after typing stops
- **On Close**: Forces save before closing
- **On Switch**: Saves current note before switching
- **Visual Feedback**: "Saving...", "Unsaved", "Saved" badges

## Differences from Full Notes Page

| Feature | Full Page (`/notes`) | Quick Notes Sheet |
|---------|---------------------|-------------------|
| Sidebar | ✅ VSCode-style tree | ❌ Replaced with dropdown |
| Space | Full page | Floating sheet |
| Access | Navigate to route | Click header icon |
| Use Case | Extended work | Quick capture/retrieve |
| Folder Management | Full UI | Simple selector |
| Drag & Drop | ✅ Between folders | ❌ Not needed |

## Styling

The QuickNotesButton accepts a `className` prop for custom styling:

```typescript
// Match your header theme
<QuickNotesButton className="
    hover:bg-zinc-200 
    dark:hover:bg-zinc-700 
    text-zinc-700 
    dark:text-zinc-300
    transition-all 
    duration-200
" />
```

## Icon

Uses Lucide React's `StickyNote` icon - familiar and recognizable.

## Testing

Test the integration:

1. ✅ Click icon opens sheet
2. ✅ Can create new notes
3. ✅ Can switch between notes
4. ✅ Changes auto-save
5. ✅ Closing doesn't lose data
6. ✅ ESC key closes sheet
7. ✅ Backdrop click closes sheet
8. ✅ Mobile responsive

## Best Practices

1. **Place near other action icons** (notifications, theme)
2. **Consistent styling** with your header
3. **Always visible** for quick access
4. **Don't hide on scroll** - should always be accessible

## Example: Adding to Main Layout

```typescript
// app/layout.tsx or your main layout component
import { QuickNotesButton } from '@/features/notes';

export default function RootLayout({ children }) {
    return (
        <div>
            <header className="fixed top-0 right-0 z-50">
                <div className="flex items-center gap-2 p-2">
                    <NotificationIcon />
                    <QuickNotesButton /> {/* Add here */}
                    <ThemeToggle />
                    <UserMenu />
                </div>
            </header>
            
            <main>{children}</main>
        </div>
    );
}
```

## Troubleshooting

**Sheet doesn't open?**
- Check FloatingSheet component is imported correctly
- Verify no z-index conflicts

**Auto-save not working?**
- Check Supabase connection
- Verify user is authenticated
- Check browser console for errors

**Notes not loading?**
- Verify Supabase RLS policies
- Check network tab for API calls
- Ensure notes table exists

## Support

For issues or questions:
- Check the main notes documentation
- Review the NotesLayout implementation
- Inspect browser console for errors

