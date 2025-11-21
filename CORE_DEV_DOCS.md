# AI Matrix Core Developer Docs

Do not add anything to this document unless approved.

## Rules For Adding
- Extremely concise
- Write for expert developers
- Structured & Organized
- Keep it short, simple, expert-level and do not repeat

## Admin Detection

### Client-Side (UI)
```typescript
import { useUser } from '@/lib/hooks/useUser';
const { isAdmin } = useUser(); // From Redux
```

### Server-Side API Routes
```typescript
import { requireAdmin } from '@/utils/auth/adminUtils';
await requireAdmin(); // Throws if not admin
```

### Server-Side Layouts (Admin + Preferences)
```typescript
import { getUserSessionData } from '@/utils/supabase/userSessionData';
const { isAdmin, preferences } = await getUserSessionData(supabase, userId);
```
