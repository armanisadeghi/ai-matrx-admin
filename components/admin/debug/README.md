# Admin Debug Module System

A scalable, easy-to-extend debug panel system for the Admin Indicator.

## Overview

The debug module system allows you to add specialized debug panels for different areas of your application. Each module appears as a small icon in the Admin Indicator and opens a full debug panel when clicked.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Admin Indicator (MediumIndicator)               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Debug: 🛡️ 💾 📡 ⚙️   (Small icons row)            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │ (click icon)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            DebugModulePanel (Portal/Modal)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🛡️ Authentication Debug                            │   │
│  │  Monitor token refresh status and session expiry    │   │
│  │  ───────────────────────────────────────────────── │   │
│  │                                                      │   │
│  │  [Your Debug Component Renders Here]                │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Files

- **`debugModuleRegistry.tsx`** - Central registry of all debug modules
- **`DebugModulePanel.tsx`** - Modal container that renders debug components
- **`TokenStatusDebug.tsx`** - Example: Auth debug component
- **`MediumIndicator.tsx`** - Displays debug icons and handles clicks

## Adding a New Debug Module

It's incredibly simple! Just 3 steps:

### Step 1: Create Your Debug Component

Create a new component in `components/admin/debug/`:

```tsx
// components/admin/debug/DatabaseDebug.tsx
'use client';

import { Card } from '@/components/ui/card';

export default function DatabaseDebug() {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Database Monitor</h3>
      <div className="space-y-4">
        {/* Your debug UI here */}
        <div>Query count: 42</div>
        <div>Avg response time: 120ms</div>
      </div>
    </Card>
  );
}
```

### Step 2: Add to Registry

Open `debugModuleRegistry.tsx` and add your module to the array:

```tsx
import DatabaseDebug from './DatabaseDebug';
import { Database } from 'lucide-react'; // Import icon

export const debugModules: DebugModule[] = [
  {
    id: 'auth',
    name: 'Authentication',
    icon: ShieldCheck,
    component: TokenStatusDebug,
    description: 'Monitor token refresh status and session expiry',
    color: 'text-green-500',
  },
  // Add your new module here:
  {
    id: 'database',
    name: 'Database',
    icon: Database,
    component: DatabaseDebug,
    description: 'Monitor database queries and performance',
    color: 'text-blue-500',
  },
];
```

### Step 3: Done!

That's it! Your debug icon will automatically appear in the Admin Indicator, and clicking it will open your component in a modal.

## Module Definition

```typescript
interface DebugModule {
  id: string;              // Unique identifier (e.g., 'auth', 'database')
  name: string;            // Display name (e.g., 'Authentication')
  icon: LucideIcon;        // Lucide React icon component
  component: ComponentType; // Your debug component
  description: string;     // Brief description for tooltip
  color?: string;          // Optional: Tailwind color class (e.g., 'text-green-500')
}
```

## Icon Selection

Choose from [Lucide React icons](https://lucide.dev/icons):

```tsx
import { 
  ShieldCheck,    // Auth/Security
  Database,       // Database
  Wifi,           // Network/WebSocket
  Activity,       // Performance
  Cog,            // Settings/Config
  Lock,           // Permissions
  Zap,            // Speed/Performance
  Bug,            // Debugging
  Terminal,       // Console/Logs
  // ... and 1000+ more
} from 'lucide-react';
```

## Best Practices

### Component Design

1. **Self-contained**: Component should fetch its own data
2. **Responsive**: Handle loading and error states
3. **Real-time**: Use intervals or subscriptions for live data
4. **Accessible**: Use semantic HTML and proper ARIA labels

### Example with Live Data

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

export default function WebSocketDebug() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    // Initial load
    loadStatus();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    // Fetch your debug data
    const data = await getWebSocketStatus();
    setStatus(data);
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">WebSocket Status</h3>
      {status && (
        <div className="space-y-2">
          <div>Connected: {status.connected ? '✅' : '❌'}</div>
          <div>Messages sent: {status.messagesSent}</div>
          <div>Messages received: {status.messagesReceived}</div>
        </div>
      )}
    </Card>
  );
}
```

## Styling Guidelines

- Use existing UI components from `@/components/ui`
- Match the dark theme of the Admin Indicator
- Keep consistent spacing (p-4, p-6, space-y-4)
- Use semantic color coding:
  - Green: Success/Active
  - Red: Error/Inactive
  - Yellow: Warning
  - Blue: Info

## User Experience

### Opening Panels
- Click any debug icon in the Admin Indicator
- Panel opens as a modal overlay
- Clicks outside the panel close it
- ESC key also closes the panel

### Panel Features
- **Header**: Shows module name, icon, and description
- **Close button**: X in top-right corner
- **Scrollable content**: For long debug outputs
- **Portal rendering**: Always appears on top, outside normal DOM flow

## Example Modules Ideas

Here are some ideas for future debug modules:

- 🗄️ **Database** - Query logs, connection pool status
- 📡 **WebSocket** - Connection status, message logs
- 🚀 **Performance** - Render times, memory usage
- 🔐 **Permissions** - Current user roles, access control
- 📊 **Analytics** - Event tracking, user behavior
- 🌐 **API** - Request logs, response times
- 💾 **Cache** - Redis status, cache hit rates
- 🔔 **Notifications** - Queue status, delivery logs
- 🎨 **Theme** - Current theme, CSS variables
- 📝 **Logs** - Application logs, error tracking

## Troubleshooting

### Icon Not Appearing
- Check that your module is in `debugModules` array
- Verify the import path is correct
- Check browser console for errors

### Component Not Rendering
- Ensure component is exported as default
- Check that component is client-side (`'use client'`)
- Verify no TypeScript errors

### Modal Not Closing
- Check onClick handlers on overlay and close button
- Verify state management in MediumIndicator
- Check for event propagation issues

## Technical Notes

### Portal Rendering
The `DebugModulePanel` uses React portals to render outside the Admin Indicator's DOM hierarchy. This ensures:
- Modal appears above all content (z-index: 9999)
- No styling conflicts with parent components
- Proper positioning and backdrop

### State Management
- `activeDebugModule` state in MediumIndicator tracks which module is open
- Only one module can be open at a time
- State is reset when panel closes

### Performance
- Debug components only mount when their panel is opened
- Unmount when panel closes (cleanup effects run)
- No performance impact when panels are closed
