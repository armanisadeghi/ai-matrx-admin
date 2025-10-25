# File Management System

A comprehensive, production-ready file management system for AI Matrx with multi-bucket support, file type filtering, and advanced file operations.

## 📁 Route Structure

### Main Routes

| Route | Description | View Type |
|-------|-------------|-----------|
| `/files` | All files across all buckets | Multi-bucket view |
| `/files/bucket/[bucket]` | Single bucket view | Single-bucket tree |
| `/files/images` | All image files | Filtered multi-bucket |
| `/files/audio` | All audio files | Filtered multi-bucket |
| `/files/documents` | All document files | Filtered multi-bucket |
| `/files/code` | All code files | Filtered multi-bucket |
| `/files/videos` | All video files | Filtered multi-bucket |
| `/files/recent` | Recently accessed files | Special view (Coming Soon) |
| `/files/shared` | Shared files | Special view (Coming Soon) |

### Bucket-Specific Routes

- `/files/bucket/userContent` - User Content bucket
- `/files/bucket/Images` - Images bucket
- `/files/bucket/Audio` - Audio bucket
- `/files/bucket/Documents` - Documents bucket
- `/files/bucket/Code` - Code bucket
- `/files/bucket/any-file` - Mixed file types bucket

## 🏗️ Architecture

### Directory Structure

```
app/(authenticated)/files/
├── file-routes.config.ts          # Route definitions and configuration
├── layout.tsx                     # Main layout with sidebar
├── page.tsx                       # All files view (default)
├── components/
│   ├── FileManagerSidebar.tsx     # Navigation sidebar
│   └── FilteredFileView.tsx       # Shared component for filtered views
├── bucket/[bucket]/
│   └── page.tsx                   # Dynamic bucket view
├── images/page.tsx                # Images filter
├── audio/page.tsx                 # Audio filter
├── documents/page.tsx             # Documents filter
├── code/page.tsx                  # Code filter
├── videos/page.tsx                # Videos filter
├── recent/page.tsx                # Recent files (Coming Soon)
└── shared/page.tsx                # Shared files (Coming Soon)
```

### Key Components

#### FileManagerSidebar
- Left sidebar navigation
- Organized into sections: Overview, File Types, Buckets, Special
- Active route highlighting
- Smooth scrolling for long lists

#### FilteredFileView
- Reusable component for file type filtering
- Shows multi-bucket tree with visual filter indicator
- File details panel for preview
- Accepts title, description, icon, and fileCategory props

#### MultiBucketFileTree
- Displays all buckets as expandable top-level nodes
- Integrated context menus for file operations
- Drag-and-drop support
- Real-time bucket selection tracking

#### FileDetailsPanel
- Dynamic file preview based on file type
- Supports images, audio, video, code, text, PDFs, and more
- Displays file metadata
- Intelligent URL fetching (public/signed)

## 🔧 Configuration

### file-routes.config.ts

Centralized route configuration with:
- Route definitions with icons and descriptions
- Bucket mappings
- File category definitions
- Helper functions for route lookup

```typescript
// Get all routes
const allRoutes = getAllRoutes();

// Get route by href
const route = getRouteByHref('/files/images');

// Get routes by category
const { overview, fileTypes, buckets, special } = getRoutesByCategory();
```

## 🎨 Features

### Current Features

✅ Multi-bucket file browsing
✅ Single-bucket focused view
✅ File type filtering (images, audio, documents, code, videos)
✅ Visual directory tree with folder navigation
✅ Comprehensive context menus (right-click)
✅ File operations: rename, move, duplicate, delete, share, download
✅ File preview with multiple format support
✅ Drag-and-drop support
✅ Responsive layout
✅ Dark/light theme support
✅ Smart URL fetching (public/private file handling)
✅ Toast notifications for operations

### Coming Soon

🔜 Recent files tracking
🔜 Shared files management
🔜 File search across all buckets
🔜 Advanced filters (date, size, etc.)
🔜 Batch operations
🔜 Favorites/starred files
🔜 File upload with drag-and-drop
🔜 Folder creation
🔜 Grid view option
🔜 File preview enhancements

## 🚀 Usage

### Adding a New Route

1. Add route definition to `file-routes.config.ts`:
```typescript
export const FILE_ROUTES = {
  // ...
  NEW_VIEW: {
    href: '/files/new-view',
    label: 'New View',
    description: 'Description of new view',
    icon: YourIcon,
    viewType: 'custom',
  },
};
```

2. Create the page file:
```typescript
// app/(authenticated)/files/new-view/page.tsx
export default function NewViewPage() {
  return <YourComponent />;
}
```

3. The route will automatically appear in the sidebar!

### Adding a New File Type Filter

Use the `FilteredFileView` component:
```typescript
import { FilteredFileView } from '../components/FilteredFileView';

export default function CustomFilterPage() {
  return (
    <FilteredFileView
      title="Custom Filter"
      description="Your filtered view"
      icon={YourIcon}
      fileCategory="YOUR_CATEGORY"
    />
  );
}
```

## 🔐 Security

- All file operations respect bucket permissions
- Signed URLs for private files
- Public URLs for public files
- Authentication required for all routes
- User-scoped file access

## 📊 State Management

Uses Redux for:
- File system state per bucket
- Node selection and tracking
- Operation status (loading, error)
- Cache management

## 🎯 Best Practices

1. **Always use bucketName prop** - Ensure correct Redux slice is accessed
2. **Handle loading states** - Show spinners during operations
3. **Provide user feedback** - Use toast notifications for success/error
4. **Respect file permissions** - Check public/private status
5. **Clean up on unmount** - Revoke object URLs when done
6. **Optimize re-renders** - Use useCallback and useMemo appropriately

## 🐛 Troubleshooting

### Files not loading
- Check bucket permissions in Supabase
- Verify file exists at the storage path
- Check network tab for 400/403 errors

### Context menu not working
- Ensure FileSystemProvider is in app/Providers.tsx
- Check that bucketName is correctly passed down

### Preview not showing
- Verify file URL is accessible
- Check FilePreviewProvider is in component tree
- Ensure file type is supported

## 📝 Notes

- The file management system is fully integrated with the existing Redux file system
- All routes are protected by authentication
- The sidebar persists across all file management routes
- File operations are undoable for most actions (except delete)
- The system supports both light and dark themes automatically

