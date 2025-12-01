# 🔧 Troubleshooting Guide

## Common Issues & Solutions

### 1. "Cannot share canvas" error

**Problem**: Share button doesn't work or throws error.

**Solutions**:
```typescript
// Check if canvas content is valid
console.log('Content:', content);

// Verify canvasType is valid
const validTypes = ['quiz', 'flashcards', 'presentation', 'diagram', etc.];
```

**Fix**: Ensure `canvasData` and `canvasType` are properly set.

---

### 2. Shared canvas not loading

**Problem**: `/canvas/shared/[token]` shows "Canvas not found"

**Possible Causes**:
1. Invalid token
2. Canvas was deleted
3. Canvas is private
4. Database connection issue

**Debug**:
```sql
-- Check if canvas exists
SELECT * FROM shared_canvas_items WHERE share_token = 'your-token';

-- Check visibility
SELECT visibility FROM shared_canvas_items WHERE share_token = 'your-token';
```

**Fix**: Verify token is correct and canvas visibility is `public` or `unlisted`.

---

### 3. Views not counting

**Problem**: View count stays at 0.

**Possible Causes**:
1. Creator viewing own canvas (intentional)
2. Session tracking issue
3. RLS policy blocking insert

**Debug**:
```typescript
// Check console for errors
// Views are tracked automatically in useSharedCanvas hook
```

**Fix**: Try viewing in incognito mode. Check browser console for errors.

---

### 4. Likes not working

**Problem**: Like button doesn't respond or shows error.

**Possible Causes**:
1. User not authenticated
2. Canvas ID incorrect
3. Database permissions

**Check**:
```typescript
// In browser console
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
```

**Fix**: User must be logged in to like. The system will show a toast message prompting login.

---

### 5. Scores not submitting

**Problem**: Score submission fails.

**Possible Causes**:
1. Canvas ID mismatch
2. Invalid score data
3. Database connection

**Debug**:
```typescript
// Check score data structure
console.log({
  canvas_id: canvasId,
  score: score,
  max_score: maxScore,
  time_taken: timeTaken
});
```

**Fix**: Ensure all required fields are provided and valid.

---

### 6. Leaderboard empty

**Problem**: Leaderboard shows "No scores yet" but scores exist.

**Possible Causes**:
1. Scores from different canvas
2. Query filter too restrictive
3. Canvas doesn't have `has_scoring` enabled

**Check**:
```sql
-- Verify scores exist
SELECT * FROM canvas_scores WHERE canvas_id = 'your-canvas-id';

-- Check has_scoring flag
SELECT has_scoring FROM shared_canvas_items WHERE id = 'your-canvas-id';
```

**Fix**: Ensure `has_scoring` is true when creating share for quiz/flashcard content.

---

### 7. Discovery page empty

**Problem**: `/canvas/discover` shows no content.

**Possible Causes**:
1. No public canvases created yet
2. Filter too restrictive
3. Database query issue

**Check**:
```sql
-- Count public canvases
SELECT COUNT(*) FROM shared_canvas_items WHERE visibility = 'public';
```

**Fix**: Create and share at least one canvas with `public` visibility.

---

### 8. Share dialog doesn't open

**Problem**: Clicking share button does nothing.

**Debug**:
```typescript
// Check if CanvasShareSheet is rendered
// Look for console errors
```

**Fix**: Verify `isShareSheetOpen` state is being managed correctly in parent component.

---

### 9. Social sharing not working

**Problem**: Twitter/Facebook/LinkedIn buttons don't work.

**Possible Causes**:
1. Popup blocked
2. Invalid URL
3. Missing share URL

**Fix**: 
- Allow popups for the domain
- Check browser console for errors
- Verify shareUrl is generated

---

### 10. Confetti not showing

**Problem**: No confetti on high scores.

**This is expected!** Confetti requires optional package:

```bash
pnpm add canvas-confetti
```

If not installed, achievements still work, just without confetti animation.

---

## Database Issues

### RLS Policy Errors

If you see "permission denied" errors:

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'canvas%';

-- Should show rowsecurity = true for all canvas tables
```

**Fix**: Re-run the RLS migration SQL.

---

### Performance Issues

If queries are slow:

```sql
-- Check indexes exist
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'canvas%';
```

**Fix**: Ensure all indexes from migration are created.

---

## TypeScript Errors

### Type Mismatch

If you get type errors with `CanvasType`:

```typescript
// Use type assertion
canvasType={content.type as CanvasType}
```

### Missing Types

If imports fail:

```typescript
// Use correct import
import type { CanvasType, SharedCanvasItem } from '@/types/canvas-social';
```

---

## Network Issues

### CORS Errors

If fetching shared canvases fails with CORS:

**Check**: Supabase URL is configured correctly
**Fix**: Verify `NEXT_PUBLIC_SUPABASE_URL` in env variables

---

### Authentication Errors

If auth operations fail:

```typescript
// Verify Supabase client is initialized
const supabase = getBrowserSupabaseClient();
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
```

**Fix**: Ensure environment variables are set.

---

## UI Issues

### Dark Mode Problems

If dark mode styling is off:

**Check**: Tailwind dark mode classes are used
**Fix**: All components use dark: variants

---

### Mobile Responsiveness

If mobile layout breaks:

**Check**: Responsive classes (sm:, md:, lg:)
**Fix**: All components are responsive by default

---

## Performance Optimization

### Slow Loading

If pages load slowly:

1. **React Query Cache**: Should be working automatically
2. **Database Indexes**: Verify they exist
3. **Image Optimization**: Use Next.js Image component
4. **Code Splitting**: Already implemented

---

### Memory Leaks

If app slows down over time:

**Check**: Component unmounting cleanup
**Fix**: All hooks properly clean up subscriptions

---

## Getting Help

### Debug Mode

Enable detailed logging:

```typescript
// In browser console
localStorage.setItem('debug', 'canvas:*');
```

### Check Logs

1. Browser console
2. Network tab
3. Supabase logs (in dashboard)

### Common Error Messages

**"Canvas not found"**
- Token invalid or canvas deleted
- Check database directly

**"Permission denied"**
- RLS policy issue
- User not authenticated

**"Must be logged in"**
- Auth required for action
- Prompt user to sign in

**"Failed to submit score"**
- Network issue or invalid data
- Check console for details

---

## Reset & Clean Start

If things are really broken:

### Clear Local Storage
```javascript
localStorage.clear();
sessionStorage.clear();
```

### Clear React Query Cache
```javascript
queryClient.clear();
```

### Verify Database
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'canvas%';

-- Should show all 6 tables
```

---

## Still Having Issues?

1. **Check Documentation**
   - `CANVAS_SOCIAL_IMPLEMENTATION.md`
   - `components/canvas/social/README.md`
   - `SETUP_COMPLETE.md`

2. **Verify Migrations**
   - All 6 should be run
   - Check Supabase dashboard

3. **Test Basic Flow**
   - Follow QUICK_START.md
   - Test each step individually

4. **Check Browser Console**
   - Look for errors
   - Verify network requests
   - Check authentication status

---

## Prevention Tips

1. **Always validate input**
   - Check canvas data structure
   - Verify required fields

2. **Handle errors gracefully**
   - Use try/catch
   - Show user-friendly messages
   - Log errors for debugging

3. **Test in incognito**
   - Simulates public user
   - No cached data
   - Clean session

4. **Monitor performance**
   - Use React DevTools
   - Check bundle size
   - Profile slow components

---

## Known Limitations

1. **Comments**: Database ready, UI not implemented yet
2. **User Profiles**: Basic structure exists, full profiles pending
3. **Analytics Dashboard**: Future feature
4. **Email Sharing**: Planned enhancement
5. **Embed Codes**: Future feature

These are not bugs—they're future enhancements!

---

## Success Criteria

Everything is working if:

✅ Share creates link
✅ Public view works
✅ Likes increment
✅ Scores submit
✅ Leaderboard shows
✅ Discovery page loads
✅ Search works
✅ Mobile responsive

If all these pass, you're good to go! 🚀

