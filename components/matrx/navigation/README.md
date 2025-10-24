# Module Header Components

## Overview

This directory contains components for rendering module headers in the application. There are now two patterns available:

### 1. Standalone Header Pattern (Legacy)
Use `ResponsiveModuleHeaderWithProvider` when you need a self-contained header with its own wrapper element.

**Use case:** Pages that don't use the new `DesktopLayout`/`MobileLayout` system.

```tsx
import ResponsiveModuleHeaderWithProvider from "@/components/matrx/navigation/ResponsiveModuleHeaderWithProvider";

<ResponsiveModuleHeaderWithProvider
    pages={pages}
    currentPath={currentPath}
    moduleHome="/your-module"
    moduleName="Your Module"
/>
```

### 2. Portal Pattern (Recommended)
Use `ModuleHeader` from `PageSpecificHeader` when using the new layout system. This renders the header content into the main header's portal slot, avoiding duplicate headers.

**Use case:** Any page using `DesktopLayout`/`MobileLayout` (most authenticated pages).

```tsx
import { ModuleHeader } from "@/components/layout/new-layout/PageSpecificHeader";

// In your layout or page component
<ModuleHeader
    pages={pages}
    currentPath={currentPath}
    moduleHome="/your-module"
    moduleName="Your Module"
/>
```

## How It Works

### Standalone Pattern
- `ResponsiveModuleHeaderWithProvider` → wraps content in `<motion.header>`
- `ModuleHeaderDesktop` → Desktop version with full header wrapper
- `ModuleHeaderMobile` → Mobile version with full header wrapper

### Portal Pattern (New)
- `ModuleHeader` (from PageSpecificHeader) → Uses React Portal
- `ResponsiveModuleHeaderContent` → Responsive wrapper without header element
- `ModuleHeaderDesktopContent` → Desktop content only (no wrapper)
- `ModuleHeaderMobileContent` → Mobile content only (no wrapper)

The portal pattern renders content into the `#page-specific-header-content` div in the main layout, preventing duplicate headers.

## Migration Guide

If you have a layout using the old standalone pattern:

**Before:**
```tsx
import ResponsiveModuleHeaderWithProvider from "@/components/matrx/navigation/ResponsiveModuleHeaderWithProvider";

<div className="sticky top-0 z-10">
    <ResponsiveModuleHeaderWithProvider
        pages={pages}
        currentPath={currentPath}
        moduleHome={MODULE_HOME}
        moduleName={MODULE_NAME}
    />
</div>
```

**After:**
```tsx
import { ModuleHeader } from "@/components/layout/new-layout/PageSpecificHeader";

// Simply call the component - no wrapper needed
<ModuleHeader
    pages={pages}
    currentPath={currentPath}
    moduleHome={MODULE_HOME}
    moduleName={MODULE_NAME}
/>
```

## Files

- `ResponsiveModuleHeaderWithProvider.tsx` - Legacy standalone header (full wrapper)
- `ModuleHeaderDesktop.tsx` - Desktop header with wrapper
- `ModuleHeaderMobile.tsx` - Mobile header with wrapper
- `ResponsiveModuleHeaderContent.tsx` - Portal-compatible responsive wrapper
- `ModuleHeaderDesktopContent.tsx` - Desktop content only (no wrapper)
- `ModuleHeaderMobileContent.tsx` - Mobile content only (no wrapper)
- `types.ts` - Shared TypeScript types

## See Also

- `components/layout/new-layout/PageSpecificHeader.tsx` - Main portal system
- `components/layout/new-layout/DesktopLayout.tsx` - Where portal target is defined
- `app/(authenticated)/tests/forms/layout.tsx` - Example implementation


