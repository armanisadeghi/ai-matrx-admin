# Settings Area

Unified settings and account management for AI Matrx.

## Structure

```
/settings
├── layout.tsx              # Shared layout with sidebar navigation
├── page.tsx                # Root page (redirects to profile)
├── profile/
│   └── page.tsx           # User profile management
├── preferences/
│   └── page.tsx           # App preferences (uses PreferencesPage component)
├── organizations/
│   └── page.tsx           # Organization list and management
└── extension/
    └── page.tsx           # Chrome extension authentication
```

## Adding a New Settings Page

1. Create a new folder under `/settings` (e.g., `/settings/security`)
2. Create a `page.tsx` file in that folder
3. Add navigation item to `layout.tsx`:
   ```tsx
   {
     title: 'Security',
     href: '/settings/security',
     icon: <Shield className="h-4 w-4" />,
     description: 'Security and privacy settings',
   }
   ```
4. Follow the standardized layout pattern:
   ```tsx
   export default function SecurityPage() {
     return (
       <div className="p-6 md:p-8 max-w-5xl mx-auto">
         {/* Your content */}
       </div>
     );
   }
   ```

## Design Guidelines

- **Container:** Use `p-6 md:p-8` for padding
- **Max Width:** Use `max-w-5xl` or `max-w-6xl` for content
- **Cards:** Use shadcn Card components for sections
- **Spacing:** Use consistent gap spacing (gap-4, gap-6)
- **Backgrounds:** Rely on layout's `bg-textured` background

## Navigation

All settings navigation is handled by the shared `layout.tsx`. The layout provides:
- Consistent header with back button
- Sidebar navigation (always visible on desktop)
- Active state management
- Responsive mobile layout

## Related Documentation

- See `SETTINGS_CONSOLIDATION.md` for migration details
- See component docs in `/components/user-preferences` for preferences components
- See `/features/organizations` for organization management features

