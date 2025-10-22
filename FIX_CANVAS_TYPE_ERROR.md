# 🔧 Fix Canvas Type Error - Quick Guide

## The Problem
The database constraint only allows specific canvas types, but you're trying to share content with types like `iframe`, `html`, `code`, etc. that weren't in the original list.

## ✅ The Solution (2 Steps)

### Step 1: Run the Migration

Copy and paste this SQL in your Supabase SQL Editor:

```sql
-- Update canvas_type constraint to include all supported types
ALTER TABLE shared_canvas_items 
DROP CONSTRAINT IF EXISTS shared_canvas_items_canvas_type_check;

ALTER TABLE shared_canvas_items
ADD CONSTRAINT shared_canvas_items_canvas_type_check 
CHECK (canvas_type IN (
    'quiz',
    'flashcards',
    'flashcard',
    'game',
    'diagram',
    'timeline',
    'comparison',
    'decision-tree',
    'troubleshooting',
    'research',
    'progress',
    'presentation',
    'resources',
    'recipe',
    'iframe',
    'html',
    'code',
    'image',
    'other'
));
```

**Or** run the migration file:
```bash
# In Supabase dashboard, go to SQL Editor and run:
# supabase/migrations/20250122_update_canvas_types.sql
```

### Step 2: Try Sharing Again

1. Refresh your browser
2. Try sharing your canvas again
3. Check the console for: `📝 Canvas Type: [your-type]`
4. Should work now! 🎉

## 🎯 What Canvas Types Are Now Supported

All of these work:
- ✅ `quiz` - Interactive quizzes
- ✅ `flashcards` - Study cards
- ✅ `presentation` - Slideshows
- ✅ `diagram` - Interactive diagrams
- ✅ `timeline` - Timeline views
- ✅ `research` - Research content
- ✅ `troubleshooting` - Troubleshooting guides
- ✅ `decision-tree` - Decision trees
- ✅ `resources` - Resource collections
- ✅ `progress` - Progress trackers
- ✅ `recipe` - Cooking recipes
- ✅ `iframe` - Embedded iframes (your case!)
- ✅ `html` - HTML content
- ✅ `code` - Code snippets
- ✅ `image` - Images
- ✅ `other` - Anything else

## 🐛 Still Having Issues?

Check the console logs:
- `📝 Canvas Type:` - Shows what type is being used
- `📦 Canvas Data Type:` - Shows if data is valid
- `❌ Database error:` - Shows any database errors

The error message will tell you exactly what's wrong!

