---
name: ios-mobile-first
description: Ensures iOS-native mobile experience on responsive web. Handles viewport units, safe areas, input zoom prevention, touch targets, and layout patterns. Use when building or fixing mobile layouts, working with responsive components, or when mobile UX issues are mentioned.
---

# iOS Mobile-First Design

Delivers iOS-native mobile experience on the web. Desktop functionality is preserved while mobile gets first-class treatment.

## Core Mobile Principles

### 1. iOS-Like UX Standards
- Touch targets: minimum 44×44pt (Apple HIG standard)
- Gesture-first interactions (swipe, drag, pull-to-refresh)
- Bottom-sheet patterns for modals on mobile
- Native-feeling transitions (iOS timing curves)
- Safe area respect (notch, home indicator, status bar)

### 2. Performance Requirements
- Initial render < 1s on mobile
- 60fps scrolling and animations
- Touch response < 100ms
- No layout shifts during page load

---

## Viewport & Layout Fundamentals

### Dynamic Viewport Units

**Always use `dvh` (dynamic viewport height) — never `vh` or `screen`:**

```tsx
// ✅ Correct - adapts to mobile browser chrome
<div className="h-dvh">
<div className="min-h-dvh">
<div className="max-h-dvh">

// ❌ Wrong - causes issues when browser chrome appears/hides
<div className="h-screen">
<div className="min-h-screen">
```

**Why:** Mobile browsers hide/show address bars during scroll. `dvh` adapts; `vh` doesn't.

### Safe Area Insets

**All fixed bottom elements require `pb-safe`:**

```tsx
// ✅ Correct - respects iPhone home indicator
<div className="fixed bottom-0 pb-safe">

// ✅ Also available
<div className="mb-safe"> {/* margin-bottom safe area */}

// ❌ Wrong - will be obscured by home indicator
<div className="fixed bottom-0 pb-4">
```

**Custom utilities defined in `globals.css`:**
```css
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 1rem); }
.mb-safe { margin-bottom: env(safe-area-inset-bottom, 1rem); }
```

### Header Height Variable

**Never hardcode header heights:**

```tsx
// ✅ Correct - uses CSS variable
<div className="h-[calc(100dvh-var(--header-height))]">

// ✅ Also correct - direct Tailwind class
<div className="h-[calc(100dvh-2.5rem)]">

// ❌ Wrong - hardcoded, will break if header changes
<div className="h-[calc(100vh-40px)]">
```

**The variable:**
```css
--header-height: 2.5rem; /* Unified for mobile and desktop */
```

---

## Essential Layout Patterns

### Full-Screen Page Layout

Standard pattern for pages that fill the viewport:

```tsx
<div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden">
  <div className="flex-1 overflow-y-auto pb-safe">
    {/* Scrollable content */}
  </div>
</div>
```

**Breakdown:**
- `h-[calc(100dvh-var(--header-height))]` - full height minus header
- `flex flex-col` - vertical stacking
- `overflow-hidden` - prevents double scrollbars
- `flex-1 overflow-y-auto` - main content scrolls
- `pb-safe` - respects safe area at bottom

### Standard Scrollable Page

For pages without fixed elements:

```tsx
<div className="min-h-dvh">
  <div className="container mx-auto py-6 px-4">
    {/* Content */}
  </div>
</div>
```

### Fixed Bottom Elements

Navigation bars, action sheets, CTAs:

```tsx
<div className="fixed bottom-0 left-0 right-0 pb-safe bg-card border-t">
  <div className="container mx-auto px-4 py-3">
    {/* Buttons, actions */}
  </div>
</div>
```

### Content With Fixed Bottom Bar

Combining scrollable content with sticky footer:

```tsx
<div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden">
  {/* Scrollable content */}
  <div className="flex-1 overflow-y-auto">
    <div className="px-4 py-6">{/* Content */}</div>
  </div>
  
  {/* Fixed bottom bar */}
  <div className="flex-shrink-0 pb-safe bg-card border-t">
    <div className="px-4 py-3">{/* Actions */}</div>
  </div>
</div>
```

---

## iOS Zoom Prevention

### Input Font Size Rule

**All inputs and textareas must have ≥16px font size:**

```tsx
// ✅ Correct - prevents iOS auto-zoom
<Input 
  className="text-base"
  style={{ fontSize: '16px' }}
/>

<Textarea
  className="text-base"
  style={{ fontSize: '16px' }}
/>

// ❌ Wrong - iOS will zoom in on focus
<Input className="text-sm" />
```

**Why:** iOS zooms inputs with font-size < 16px. This disrupts UX.

### Viewport Meta Tag

Required in `app/config/viewport.ts`:

```ts
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```

---

## Mobile-Responsive Components

### Responsive Flex Layouts

Stack vertically on mobile, horizontal on desktop:

```tsx
// ✅ Pattern 1: Direct responsive classes
<div className="flex flex-col sm:flex-row gap-4">

// ✅ Pattern 2: Responsive items
<div className="flex flex-col sm:flex-row items-start sm:items-center">

// ✅ Pattern 3: Wrap on overflow
<div className="flex flex-wrap gap-2">
```

### Conditional Content Display

Show/hide based on screen size:

```tsx
// Icon only on mobile, text on desktop
<Button>
  <Icon className="h-4 w-4 sm:mr-2" />
  <span className="hidden sm:inline">Label</span>
</Button>

// Full text on mobile, abbreviated on desktop when needed
<span className="sm:hidden">Full descriptive text</span>
<span className="hidden sm:inline">Brief</span>
```

### Action Button Groups

Compact on mobile, full on desktop:

```tsx
<div className="flex flex-wrap gap-2">
  <Button variant="outline" size="sm">
    <Icon className="h-4 w-4 sm:mr-2" />
    <span className="hidden sm:inline">Generate</span>
  </Button>
  <Button variant="outline" size="sm">
    <Icon className="h-4 w-4 sm:mr-2" />
    <span className="hidden sm:inline">Refresh</span>
  </Button>
</div>
```

### Touch Target Optimization

Ensure minimum 44×44pt touch targets:

```tsx
// ✅ Correct - proper sizing for touch
<Button 
  variant="ghost"
  className="h-10 w-10 p-0"  // 40px = ~44pt on most devices
>
  <Icon className="h-5 w-5" />
</Button>

// ✅ Scale switches for mobile
<Switch className="scale-90 sm:scale-100" />

// ❌ Wrong - too small for touch
<Button className="h-6 w-6 p-0">
```

### Responsive Width Patterns

```tsx
// Full width on mobile, constrained on desktop
<div className="w-full sm:w-48">
<div className="w-full sm:max-w-md">

// Category filter example
<Select>
  <SelectTrigger className="w-full sm:w-48">
    <SelectValue />
  </SelectTrigger>
</Select>
```

---

## Dialog & Modal Patterns

### **CRITICAL: Mobile = Drawer, Desktop = Dialog**

**Never use Dialog on mobile.** Always use conditional rendering:

```tsx
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

function MyComponent() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  
  // Mobile: Drawer (bottom sheet)
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerTitle className="sr-only">Title</DrawerTitle>
          <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
            {/* Content */}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
  
  // Desktop: Dialog
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-full lg:max-w-[1400px] max-h-[90dvh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Title</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {/* Content */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Mobile Drawer configuration:**
- `max-h-[85dvh]` - Leaves room for status bar and safe areas
- `overflow-y-auto` - Content scrolls smoothly
- `overscroll-contain` - Prevents bounce-to-parent scrolling
- `pb-safe` - Respects iPhone home indicator

**Desktop Dialog configuration:**
- `max-w-[95vw]` - doesn't touch screen edges
- `max-h-[90dvh]` - leaves room for safe areas
- `flex flex-col` - proper layout control
- `overflow-hidden` - prevents double scrollbars
- Inner `overflow-y-auto` - content scrolls independently

### **CRITICAL: Tabs = Desktop Only**

**Never use tabs on mobile.** Tabs cause:
1. Horizontal navigation friction
2. Nested scrolling problems (scroll trapping)
3. Hidden content users may not discover
4. Poor mobile UX

**Solution:** Stack all tab content vertically with clear section dividers.

```tsx
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function MyForm() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("basic");
  
  // Mobile: Vertical sections (no tabs)
  if (isMobile) {
    return (
      <div className="space-y-6 p-4">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <div className="h-6 w-1 bg-primary rounded-full" />
            Basic Info
          </h3>
          {/* Basic info fields */}
        </div>
        
        {/* Advanced Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <div className="h-6 w-1 bg-primary rounded-full" />
            Advanced Settings
          </h3>
          {/* Advanced fields */}
        </div>
        
        {/* Actions at bottom */}
        <div className="flex flex-col gap-3 pt-4 border-t border-border pb-safe">
          <Button className="w-full">Save</Button>
          <Button variant="outline" className="w-full">Cancel</Button>
        </div>
      </div>
    );
  }
  
  // Desktop: Tabs
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>
      <TabsContent value="basic">
        {/* Basic info fields */}
      </TabsContent>
      <TabsContent value="advanced">
        {/* Advanced fields */}
      </TabsContent>
    </Tabs>
  );
}
```

**Mobile stacking pattern features:**
- Colored accent bars (`bg-primary`) for visual hierarchy
- Border separators between sections
- All content visible via scrolling
- Full-width action buttons
- Safe area respect (`pb-safe`)

**When to stack content:**
- ✅ Forms with multiple sections/tabs
- ✅ Settings panels
- ✅ Code editors with multiple files
- ✅ Multi-step wizards showing review
- ✅ Any tabbed interface

**Nested scrolling anti-pattern:**
```tsx
// ❌ BAD - nested scrolling
<div className="overflow-y-auto">
  <Tabs>
    <TabsContent>
      <div className="overflow-y-auto max-h-[300px]">
        {/* Inner scroll area - will trap scroll */}
      </div>
    </TabsContent>
  </Tabs>
</div>

// ✅ GOOD - single scroll area
<div className="overflow-y-auto">
  <div className="space-y-4">
    {/* All content flows vertically */}
  </div>
</div>
```

---

## Responsive Grid & Spacing

### Grid Patterns

```tsx
// 1 column mobile, 2+ on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Auto-fit responsive
<div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
```

### Spacing Adjustments

```tsx
// Tighter spacing on mobile
<div className="space-y-4 sm:space-y-6">
<div className="gap-4 sm:gap-6">
<div className="p-4 sm:p-6">
<div className="px-4 py-6 sm:px-6 sm:py-8">
```

### Container Padding

```tsx
// Standard container with responsive padding
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
```

---

## Typography & Text Handling

### Fluid Typography

Use `clamp()` for responsive text scaling:

```tsx
// Headings
<h1 className="text-[clamp(2rem,1.5rem+2vw,3.5rem)]">
<h2 className="text-[clamp(1.5rem,1.25rem+1.5vw,2.5rem)]">

// Body text
<p className="text-[clamp(1rem,0.95rem+0.25vw,1.125rem)]">
```

### Text Overflow

```tsx
// Single line truncate
<span className="truncate">

// Multi-line clamp
<p className="line-clamp-2">
<p className="line-clamp-3">

// Responsive truncation
<span className="truncate max-w-[150px] sm:max-w-none">
```

---

## iOS-Specific Enhancements

### Pull-to-Refresh (Future)

When implementing pull-to-refresh:

```tsx
// Use overscroll-behavior
<div className="overscroll-contain">
```

### Haptic Feedback (PWA)

When available via Vibration API:

```ts
// Light tap
navigator.vibrate(10);

// Success feedback
navigator.vibrate([10, 20, 10]);

// Error feedback
navigator.vibrate([20, 50, 20]);
```

### iOS Momentum Scrolling

Already applied globally, but for specific containers:

```tsx
<div className="overflow-y-auto [-webkit-overflow-scrolling:touch]">
```

---

## Component Audit Checklist

When building/reviewing mobile components:

### Layout
- [ ] Uses `dvh` instead of `vh` or `screen`
- [ ] Fixed bottom elements have `pb-safe`
- [ ] Header height uses `--header-height` variable
- [ ] Proper overflow management (no double scrollbars)
- [ ] No nested scrolling areas

### Dialogs & Modals
- [ ] Uses `useIsMobile()` hook for conditional rendering
- [ ] Mobile: `Drawer` with `max-h-[85dvh]`
- [ ] Desktop: `Dialog` with `max-h-[90dvh]`
- [ ] Drawer has `overscroll-contain` and `pb-safe`
- [ ] No Dialog component used on mobile

### Tabs & Sections
- [ ] Mobile: Content stacked vertically (no tabs)
- [ ] Desktop: Tabs OK (max 5 tabs recommended)
- [ ] Mobile sections have clear visual dividers
- [ ] Section headers with accent bars for hierarchy
- [ ] All tab content accessible without horizontal navigation

### Inputs & Forms
- [ ] All inputs have `text-base` + `style={{ fontSize: '16px' }}`
- [ ] Textareas have `text-base` + `style={{ fontSize: '16px' }}`
- [ ] Form labels are properly associated with inputs
- [ ] Select triggers have proper font sizing

### Touch & Interaction
- [ ] Touch targets are ≥44×44pt (h-10, w-10 minimum)
- [ ] Buttons don't require precise aim
- [ ] Switches/toggles are easy to tap
- [ ] No hover-only interactions
- [ ] Action buttons full-width on mobile

### Responsive Behavior
- [ ] Stacks properly on mobile (`flex-col sm:flex-row`)
- [ ] Text/icons adjust for screen size
- [ ] Spacing is appropriate for mobile
- [ ] Button groups wrap or stack on mobile

### Visual
- [ ] Text is readable at mobile sizes
- [ ] Contrast ratios meet WCAG standards
- [ ] Icons are clear at small sizes
- [ ] Badges/labels don't overflow

---

## Anti-Patterns to Avoid

### ❌ Wrong Viewport Units
```tsx
// Never use these
<div className="h-screen">
<div className="min-h-screen">
<div className="h-[100vh]">
```

### ❌ Using Dialog on Mobile
```tsx
// Wrong - Dialog is desktop-only
{isMobile && (
  <Dialog>
    <DialogContent>...</DialogContent>
  </Dialog>
)}

// Correct - Use Drawer on mobile
{isMobile && (
  <Drawer>
    <DrawerContent className="max-h-[85dvh]">...</DrawerContent>
  </Drawer>
)}
```

### ❌ Using Tabs on Mobile
```tsx
// Wrong - Tabs cause UX friction on mobile
{isMobile && (
  <Tabs>
    <TabsList>
      <TabsTrigger value="tab1">Tab 1</TabsTrigger>
      <TabsTrigger value="tab2">Tab 2</TabsTrigger>
    </TabsList>
  </Tabs>
)}

// Correct - Stack sections vertically
{isMobile && (
  <div className="space-y-6">
    <div>
      <h3>Section 1</h3>
      {/* Content */}
    </div>
    <div className="border-t">
      <h3>Section 2</h3>
      {/* Content */}
    </div>
  </div>
)}
```

### ❌ Nested Scrolling
```tsx
// Wrong - Scroll trapping
<div className="overflow-y-auto">
  <div className="overflow-y-auto max-h-[300px]">
    {/* Gets stuck scrolling */}
  </div>
</div>

// Correct - Single scroll area
<div className="overflow-y-auto">
  <div className="space-y-4">
    {/* All content flows */}
  </div>
</div>
```

### ❌ Forgetting Safe Areas
```tsx
// Missing pb-safe
<div className="fixed bottom-0 p-4">

// Content will be hidden under home indicator
```

### ❌ Small Touch Targets
```tsx
// Too small for reliable touch
<Button className="h-6 w-6">
<Switch className="scale-75">
```

### ❌ Small Input Font Size
```tsx
// Will trigger iOS zoom
<Input className="text-sm" />
<Textarea className="text-xs" />
```

### ❌ Hardcoded Header Heights
```tsx
// Will break when header changes
<div className="h-[calc(100vh-40px)]">
```

### ❌ Desktop-Only Layouts
```tsx
// No mobile consideration
<div className="flex gap-4">
  <div className="w-64">Sidebar</div>
  <div>Content</div>
</div>
```

---

## Quick Reference

### Essential Patterns

```tsx
// 1. DIALOG/DRAWER CONDITIONAL
const isMobile = useIsMobile();
{isMobile ? (
  <Drawer open={isOpen} onOpenChange={setIsOpen}>
    <DrawerContent className="max-h-[85dvh]">
      <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
        {content}
      </div>
    </DrawerContent>
  </Drawer>
) : (
  <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <DialogContent className="max-w-[95vw] w-full lg:max-w-[1400px] max-h-[90dvh] overflow-hidden flex flex-col">
      <DialogHeader><DialogTitle>Title</DialogTitle></DialogHeader>
      <div className="flex-1 overflow-y-auto">{content}</div>
    </DialogContent>
  </Dialog>
)}

// 2. TABS → STACKED SECTIONS
{isMobile ? (
  <div className="space-y-6 p-4">
    <div className="space-y-4">
      <h3 className="flex items-center gap-2">
        <div className="h-6 w-1 bg-primary rounded-full" />
        Section 1
      </h3>
      {content1}
    </div>
    <div className="space-y-4 pt-4 border-t">
      <h3 className="flex items-center gap-2">
        <div className="h-6 w-1 bg-primary rounded-full" />
        Section 2
      </h3>
      {content2}
    </div>
  </div>
) : (
  <Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList>
      <TabsTrigger value="1">Section 1</TabsTrigger>
      <TabsTrigger value="2">Section 2</TabsTrigger>
    </TabsList>
    <TabsContent value="1">{content1}</TabsContent>
    <TabsContent value="2">{content2}</TabsContent>
  </Tabs>
)}
```

### Essential Classes

```tsx
// Viewport heights
h-dvh min-h-dvh max-h-dvh

// Safe areas
pb-safe mb-safe

// Full height with header
h-[calc(100dvh-var(--header-height))]

// Mobile responsive flex
flex-col sm:flex-row

// Mobile responsive display
hidden sm:inline sm:block

// Touch-friendly sizing
h-10 w-10 p-0

// iOS input font size
text-base style={{ fontSize: '16px' }}

// Drawer
max-h-[85dvh] overscroll-contain

// Dialog
max-h-[90dvh] overflow-hidden flex flex-col
```

### Testing Checklist

Before marking mobile work complete:

1. Test on physical iOS device (Safari)
2. Test in Chrome DevTools device mode (iPhone 14/15)
3. Rotate device - portrait and landscape both work
4. Scroll content - no double scrollbars
5. Focus inputs - no unexpected zoom
6. Tap all interactive elements - 44pt targets work
7. Check safe areas - bottom content not obscured
8. Test dark mode - everything readable

---

## Project-Specific Conventions

### Design Tokens

```tsx
// Backgrounds (with texture)
<div className="bg-textured">     // Main backgrounds
<div className="bg-card">          // Card backgrounds

// Colors
text-primary text-secondary text-accent
bg-primary bg-secondary bg-accent
```

### Layout Components

```tsx
// Responsive layout switcher (1024px breakpoint)
import { ResponsiveLayout } from "@/components/layout/new-layout/ResponsiveLayout";

// Multi-position sheet
import { FloatingSheet } from "@/components/official/FloatingSheet";

// Mobile detection hook
import { useMobile } from "@/hooks/use-mobile";
```

### Animation Standards

```tsx
// CSS-first for simple animations
<div className="
  transition-all duration-300
  [@starting-style]:opacity-0
  [@starting-style]:translate-y-4
">

// Framer Motion only for complex gestures/physics
import { motion } from "framer-motion";
```

---

## Summary

**Golden rules for iOS-like mobile web:**

1. **Always `dvh`** - never `vh` or `screen`
2. **Always `pb-safe`** - for fixed bottom elements
3. **Always 16px inputs** - prevents iOS zoom
4. **Always 44pt touch** - minimum tap targets
5. **Always header variable** - `--header-height`
6. **Always Drawer on mobile** - never Dialog
7. **Never tabs on mobile** - stack vertically instead
8. **Avoid nested scrolling** - single scroll area per view
9. **Always test iOS Safari** - on real device

### Decision Tree: Dialogs & Tabs

```
Need to show modal content?
├─ Mobile? → Use Drawer with max-h-[85dvh]
└─ Desktop? → Use Dialog with max-h-[90dvh]

Content has multiple sections?
├─ Mobile? → Stack vertically with section headers
└─ Desktop? → Tabs OK (max 5 tabs)

Form fields scrollable?
├─ Mobile? → Single scroll area, no nested scrolling
└─ Desktop? → Can use nested if needed (but avoid)
```

Follow these patterns and your mobile experience will feel native, not like a desktop site squeezed onto a phone.
