# Quick Actions & Utilities Hub

## Quick Actions Menu

Dropdown menu in header (⚡ icon) for fast access to common tools.

### Adding New Actions

Edit `features/quick-actions/components/QuickActionsMenu.tsx`:

```typescript
// 1. Add state
const [isMyActionOpen, setIsMyActionOpen] = useState(false);

// 2. Add menu item
<DropdownMenuItem onClick={() => setIsMyActionOpen(true)}>
    <Icon className="h-4 w-4 mr-2" />
    <div>
        <span>My Action</span>
        <span className="text-xs text-zinc-500">Description</span>
    </div>
</DropdownMenuItem>

// 3. Add sheet/modal
<FloatingSheet isOpen={isMyActionOpen} onClose={() => setIsMyActionOpen(false)}>
    <MyComponent />
</FloatingSheet>
```

### Current Actions
- **Notes**: Side sheet for quick note capture
- **Tasks**: Side sheet for task management
- **Chat**: AI conversation assistant
- **Data**: User-generated table viewer
- **Utilities Hub**: Full-screen overlay with tabs

---

## Utilities Hub

Full-screen tabbed overlay for complex tools.

### Adding New Tabs

Edit `features/quick-actions/components/UtilitiesOverlay.tsx`:

```typescript
const tabs: TabDefinition[] = [
    {
        id: 'notes',
        label: '📝 Notes',
        content: <NotesLayout />,
    },
    {
        id: 'mytab',
        label: '🔧 My Tool',
        content: <MyToolLayout />,
    },
];
```

### When to Use What

**Quick Action Sheet**: Fast in-and-out (forms, quick capture)  
**Utilities Hub Tab**: Complex UI (multi-panel, extended work)

That's it.

