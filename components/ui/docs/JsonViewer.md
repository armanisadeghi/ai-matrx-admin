# JSON Viewer Component

## Imports

```typescript
import { JsonViewer, FullJsonViewer } from '@/components/ui/JsonViewer';
```

## JsonViewer Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| data | object | Yes | - | JSON object to display |
| initialExpanded | boolean | No | false | Initial expansion state |
| maxHeight | string | No | '400px' | Max height of container |
| className | string | No | - | Additional CSS classes |

## FullJsonViewer Props

Extends `JsonViewerProps` with:

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| title | string | No | "JSON Data" | Title for the card |
| className | string | No | - | Additional CSS classes for card |

## Usage

```tsx
<JsonViewer data={yourJsonObject} />

<FullJsonViewer 
  data={yourJsonObject} 
  title="Custom Title"
  maxHeight="600px"
/>

<FullJsonViewer 
  data={yourJsonObject} 
  initialExpanded={true}
  className={cn("custom-class", someCondition && "conditional-class")}
/>
```

## Notes

- `FullJsonViewer` wraps `JsonViewer` in a Card component with a title
- Expand/Collapse All and Copy buttons are built-in
- Uses Tailwind classes and app CSS variables for theming
- Nested object expansion is handled internally
- All props not listed are passed through to the root element
- All support className prop class merging using cn utility 
