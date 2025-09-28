# HTML Pages Feature

This feature allows users to save HTML pages to a database and view them via iframe. It replaces the old static site deployment system with a more robust database-driven approach.

## Architecture

### Database Connection
- Uses a separate Supabase database specifically for HTML pages
- Connection configured in `lib/supabase-html.js`
- Independent from the main app's Supabase database

### File Structure
```
features/html-pages/
├── lib/
│   └── supabase-html.js          # Supabase client for HTML pages DB
├── services/
│   └── htmlPageService.js        # Database operations service
├── hooks/
│   └── useHTMLPages.js          # React hook for HTML pages
└── README.md                    # This file
```

## Environment Variables Required

Add these to your `.env.local`:

```bash
# Supabase credentials for the HTML pages project
NEXT_PUBLIC_SUPABASE_HTML_URL=https://viyklljfdhtidwecakwx.supabase.co
NEXT_PUBLIC_SUPABASE_HTML_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpeWtsbGpmZGh0aWR3ZWNha3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzg4MDAsImV4cCI6MjA3NDY1NDgwMH0.ft4lQevyknckVrvM5LbhZ0KKSw7N1dlMUh8X37JuWhs

# Static site URLs
NEXT_PUBLIC_HTML_SITE_URL=https://mymatrx.com
```

## Usage

### Basic Usage
```javascript
import { useHTMLPages } from '@/features/html-pages/hooks/useHTMLPages';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectUser } from '@/lib/redux/selectors/userSelectors';

function MyComponent() {
  const user = useAppSelector(selectUser);
  const { createHTMLPage, isCreating, error } = useHTMLPages(user?.id);

  const handleSave = async () => {
    try {
      const result = await createHTMLPage(
        '<html><body><h1>Hello World</h1></body></html>',
        'My Test Page',
        'A test page created programmatically'
      );
      
      console.log('Page saved:', result);
      // result.url will be something like: https://mymatrx.com/p/uuid
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  return (
    <button onClick={handleSave} disabled={isCreating}>
      {isCreating ? 'Saving...' : 'Save Page'}
    </button>
  );
}
```

### Service Methods
```javascript
import { HTMLPageService } from '@/features/html-pages/services/htmlPageService';

// Create a page
const page = await HTMLPageService.createPage(htmlContent, title, description, userId);

// Get user's pages
const userPages = await HTMLPageService.getUserPages(userId);

// Get a specific page
const page = await HTMLPageService.getPage(pageId);

// Delete a page
await HTMLPageService.deletePage(pageId, userId);
```

## Integration Points

### HtmlPreviewModal
The main integration is in `components/matrx/buttons/HtmlPreviewModal.tsx`:
- "Save Page" tab allows users to save HTML to database
- Shows success message with shareable URL
- Displays live preview in iframe
- Handles user authentication checking

### User Authentication
- Uses Redux selectors to get current user: `useAppSelector(selectUser)`
- Requires user to be logged in to save pages
- User ID is passed to all database operations for security

## Database Schema

The system expects an `html_pages` table with these columns:
- `id` (UUID, primary key)
- `html_content` (TEXT, the complete HTML)
- `title` (VARCHAR, page title)
- `description` (TEXT, optional description)
- `user_id` (UUID, references user table)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## URL Format

Saved pages are accessible at:
```
https://mymatrx.com/p/{page-uuid}
```

## Security

- All database operations include user_id for row-level security
- Pages can only be deleted by their creator
- Uses Supabase RLS (Row Level Security) policies
- Separate database prevents interference with main app data

## Error Handling

The system provides comprehensive error handling:
- Database connection errors
- Validation errors (missing title, user not logged in)
- Network errors
- User-friendly error messages in UI

## Performance

- Database-driven approach scales better than file system
- Pages are instantly available after creation
- No build/deployment delays
- Efficient iframe rendering
