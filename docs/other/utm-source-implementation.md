# UTM Source Implementation

## Overview
All external links displayed in the application now automatically include `?utm_source=aimatrx` parameter. Any existing `utm_source` parameters are replaced to ensure consistency.

## Implementation Details

### Core Utility
**File:** `/utils/url-utm.ts`

The `addUtmSource()` function:
- Adds `?utm_source=aimatrx` to all external URLs
- Removes any existing `utm_source` parameters (case-insensitive)
- Safely handles edge cases:
  - Relative URLs (unchanged)
  - Anchor links (unchanged)
  - mailto/tel links (unchanged)
  - Malformed URLs (returns original, logs warning)
  - URLs without protocol (attempts to fix by adding https://)

### Modified Components

1. **LinkComponent** (`components/mardown-display/blocks/links/LinkComponent.tsx`)
   - Main interactive link component with hover preview
   - Used for standalone markdown links in chat messages
   - All href attributes, copy actions, and open actions use UTM-enhanced URLs

2. **Table Renderers**
   - `StreamingTableRenderer.tsx` - Links within streaming tables
   - `MarkdownTable.tsx` - Links within static tables
   - Both apply UTM source during markdown link rendering

3. **LinkWrapper** (`components/message-display/blocks/LinkWrapper.tsx`)
   - Generic link wrapper component
   - Adds UTM source to external links only

4. **LinkDisplay** (`components/playground/results/LinkDisplay.tsx`)
   - Playground link display component
   - Shows domain with UTM-enhanced URL

5. **Lines Viewer** (`components/mardown-display/chat-markdown/analyzer/analyzer-options/lines-viewer.tsx`)
   - Analyzer link rendering
   - Applies UTM source to analyzed links

## Testing

Tested with the following URLs:
- ✅ `https://www.theverge.com/...?utm_source=openai` → Replaced with `utm_source=aimatrx`
- ✅ `https://www.reuters.com/...` → Added `?utm_source=aimatrx`
- ✅ URLs with existing query parameters → Preserves parameters, adds/replaces utm_source
- ✅ Relative URLs → Left unchanged
- ✅ Anchor links → Left unchanged
- ✅ mailto/tel links → Left unchanged

## Benefits

1. **Consistent Tracking:** All outbound links are tracked with our UTM source
2. **No Conflicts:** Removes competing UTM sources automatically
3. **Safe:** Never breaks links - falls back to original URL on parsing errors
4. **Comprehensive:** Covers all link rendering paths in the application
5. **Maintainable:** Single utility function used everywhere

## Usage in New Components

To add UTM source to links in new components:

```typescript
import { addUtmSource } from '@/utils/url-utm';

const MyComponent = ({ url }) => {
  const finalUrl = addUtmSource(url);
  
  return (
    <a href={finalUrl} target="_blank" rel="noopener noreferrer">
      Link Text
    </a>
  );
};
```

## Future Enhancements

If needed, the utility can be extended to:
- Support custom UTM parameters (campaign, medium, etc.)
- Handle different UTM sources for different contexts
- Add UTM parameters in bulk to arrays of URLs

