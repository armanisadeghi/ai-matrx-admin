# Utilities Overlay - Full-Screen Notes & More

## ✅ What's Live

A **full-screen tabbed overlay** for utilities that benefit from more space and extended work sessions.

### Access
Click **⚡ Quick Actions** in header → **"Utilities Hub"**

## 🎛️ Current Setup

### Tabs
1. **📝 Notes** - Full `NotesLayout` with sidebar and editor (currently active)
2. **✓ Tasks** - Ready to add (commented out)
3. **📁 Files** - Ready to add (commented out)

### Features
- ✅ 95vw x 95vh overlay
- ✅ Tabbed interface at top
- ✅ Full notes app with sidebar
- ✅ Clean, modern UI
- ✅ ESC to close
- ✅ Backdrop click to close

## 📝 How It Works

```typescript
// components/layout/UtilitiesOverlay.tsx

const tabs: TabDefinition[] = [
    {
        id: 'notes',
        label: '📝 Notes',
        content: <NotesLayout />, // Full notes app
    },
    // More tabs here...
];

<FullScreenOverlay
    isOpen={isOpen}
    onClose={onClose}
    title="Utilities"
    tabs={tabs}
    width="95vw"
    height="95vh"
/>
```

## 🚀 Adding New Tabs

### Example: Adding Tasks

```typescript
// 1. Uncomment in UtilitiesOverlay.tsx:
{
    id: 'tasks',
    label: '✓ Tasks',
    content: (
        <div className="h-full">
            <TasksLayout /> // Your tasks component
        </div>
    ),
}

// 2. Import your component:
import { TasksLayout } from '@/features/tasks';

// Done! New tab appears automatically
```

## 🎯 Best Practices

### Use Utilities Overlay Tabs For:
- ✅ **Complex UIs** - Multi-panel layouts (like Notes with sidebar)
- ✅ **Extended Sessions** - User needs to work for a while
- ✅ **Full Features** - Complete CRUD with navigation
- ✅ **Rich Content** - Tables, editors, previews

### Don't Use For:
- ❌ Quick forms (use Quick Action Sheet instead)
- ❌ Single field capture (use Quick Action Sheet)
- ❌ Simple lists (use Quick Action Sheet)

## 📊 Current Architecture

```
Quick Actions Menu (⚡)
│
├─ Notes (Side Sheet)
│  └─ QuickNotesSheet
│     └─ Simple editor with dropdown selector
│
└─ Utilities Hub (Full Overlay)
   └─ UtilitiesOverlay
      └─ Tab: Notes
         └─ NotesLayout (full app)
      └─ Tab: Tasks (ready to add)
      └─ Tab: Files (ready to add)
      └─ Tab: ... (your additions)
```

## 🎨 UI/UX Design

### Layout
```
┌────────────────────────────────────────────┐
│ Utilities                [📝 Notes] [✓ Tasks] │  ← Tab Bar
├────────────────────────────────────────────┤
│ ┌────────┬──────────────────────────────┐ │
│ │ Folder │ Note Editor                  │ │
│ │  Tree  │                               │ │
│ │        │                               │ │
│ │        │                               │ │
│ └────────┴──────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### Tab Design
- Pills at top center
- First/last tabs rounded
- Active state highlighted
- Easy switching

## 🔧 Files

```
components/layout/
├── QuickActionsMenu.tsx     ← Dropdown menu
├── UtilitiesOverlay.tsx     ← THIS FILE (the overlay)
└── QUICK_ACTIONS_GUIDE.md   ← Full documentation

features/notes/
├── components/NotesLayout.tsx  ← Embedded in overlay
└── ...
```

## 💡 Ideas for Future Tabs

- ✅ **Tasks/Todo** - Full kanban or list view
- 📅 **Calendar** - Month/week/day views
- 📁 **File Manager** - Browse and organize files
- 📊 **Dashboard** - Stats and analytics
- 🎨 **Media Library** - Images, videos, assets
- 📧 **Messages** - Communication hub
- ⚙️ **Settings** - App configuration
- 🔍 **Search** - Global search interface
- 📈 **Reports** - Data visualizations
- 🧪 **Experiments** - Feature testing

## 🎯 Comparison: Sheet vs Overlay

| Feature | Quick Notes Sheet | Utilities Overlay |
|---------|------------------|-------------------|
| **Size** | Side panel (xl) | Full screen (95%) |
| **Navigation** | Dropdown selector | Sidebar + tabs |
| **Use Case** | Quick capture | Extended work |
| **Interface** | Minimal | Full-featured |
| **When** | In-and-out | Deep work |

## 🔑 Key Takeaways

1. **Utilities Hub** = Full-screen overlay with tabs
2. **Currently**: Notes tab (fully functional)
3. **Easy to add**: Just add tab definition + component
4. **Perfect for**: Complex UIs that need space
5. **Accessible from**: ⚡ Quick Actions → Utilities Hub

---

**The overlay is live! Test it by clicking ⚡ → Utilities Hub in your header.** 🚀

