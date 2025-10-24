# Transcripts Feature

## 📋 Overview

The Transcripts feature provides a complete database-backed system for managing audio/video transcripts with full CRUD operations, real-time sync, and seamless import from AI-generated transcripts.

---

## ✨ Features

### Core Functionality
- ✅ **Full Database Persistence** - All transcripts stored in Supabase
- ✅ **Real-time Sync** - Live updates across sessions
- ✅ **Segment Management** - Timestamps, speakers, and text
- ✅ **Rich Metadata** - Duration, word count, speaker tracking
- ✅ **File References** - Links to audio/video files in Supabase Storage
- ✅ **Organization** - Folders, tags, and search
- ✅ **Import from AI** - One-click import from AI-generated transcripts
- ✅ **Export** - Download as text file

### Advanced Features
- 🎯 **Multi-source Support** - Audio, Video, Meetings, Interviews
- 🎯 **Speaker Tracking** - Automatic speaker detection and labeling
- 🎯 **Search & Filter** - Full-text search, folder filtering
- 🎯 **Editing** - Edit segments, split, merge, delete
- 🎯 **Copy & Duplicate** - Clone entire transcripts
- 🎯 **Soft Delete** - Recover deleted transcripts

---

## 🚀 Getting Started

### Step 1: Run the Database Migration

**REQUIRED:** Run this SQL in your Supabase SQL Editor:

```sql
-- See: features/transcripts/migrations/create_transcripts_table.sql
```

This creates:
- `transcripts` table with all necessary columns
- Indexes for performance
- Row Level Security policies
- Triggers for auto-updated timestamps

### Step 2: Verify the Route

Navigate to `/transcripts` to access the transcript management interface.

### Step 3: Import Your First Transcript

1. Have an AI generate a transcript (with timestamps)
2. Click the "Import" button on the transcript block
3. Fill in title and details
4. Click "Import Transcript"
5. View it in `/transcripts`!

---

## 📁 File Structure

```
features/transcripts/
├── migrations/
│   └── create_transcripts_table.sql  # Database migration
├── service/
│   └── transcriptsService.ts         # CRUD operations
├── context/
│   └── TranscriptsContext.tsx        # React context provider
├── components/
│   ├── TranscriptsLayout.tsx         # Main layout
│   ├── TranscriptsSidebar.tsx        # Folder/transcript browser
│   ├── TranscriptViewer.tsx          # Display/edit transcript
│   ├── TranscriptToolbar.tsx         # Action buttons
│   ├── ImportTranscriptModal.tsx     # Import modal
│   └── index.ts                      # Component exports
├── types.ts                          # TypeScript interfaces
├── index.ts                          # Main exports
└── README.md                         # This file
```

---

## 🗄️ Database Schema

### `transcripts` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `title` | TEXT | Transcript title |
| `description` | TEXT | Optional description |
| `segments` | JSONB | Array of transcript segments |
| `metadata` | JSONB | Duration, word count, speakers, etc. |
| `audio_file_path` | TEXT | Path to audio in Supabase Storage |
| `video_file_path` | TEXT | Path to video in Supabase Storage |
| `source_type` | TEXT | 'audio', 'video', 'meeting', 'interview', 'other' |
| `tags` | TEXT[] | Array of tags |
| `folder_name` | TEXT | Folder for organization |
| `is_deleted` | BOOLEAN | Soft delete flag |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

### Segment Structure (JSONB)

```typescript
{
  id: string;           // Unique segment ID
  timecode: string;     // Display format "MM:SS" or "HH:MM:SS"
  seconds: number;      // Total seconds for seeking
  text: string;         // Transcript text
  speaker?: string;     // Optional speaker name
}
```

---

## 🎯 Usage Examples

### Creating a Transcript

```typescript
import { useTranscriptsContext } from '@/features/transcripts';

const { createTranscript } = useTranscriptsContext();

await createTranscript({
  title: 'Team Meeting - Oct 24',
  description: 'Weekly sync discussion',
  segments: [
    {
      id: 'seg-1',
      timecode: '00:00',
      seconds: 0,
      text: 'Welcome everyone to the meeting.',
      speaker: 'John'
    },
    // ... more segments
  ],
  source_type: 'meeting',
  folder_name: 'Meetings',
  tags: ['team', 'weekly'],
});
```

### Updating a Transcript

```typescript
const { updateTranscript } = useTranscriptsContext();

await updateTranscript(transcriptId, {
  title: 'Updated Title',
  segments: updatedSegments,
});
```

### Importing from AI Transcript

1. AI generates transcript with timestamps
2. User clicks "Import" button on TranscriptBlock
3. ImportTranscriptModal opens with parsed segments
4. User fills in title/details and clicks "Import"
5. Transcript created and saved to database

---

## 🔌 API Reference

### Context Methods

#### `createTranscript(input: CreateTranscriptInput): Promise<Transcript>`
Create a new transcript.

#### `updateTranscript(id: string, updates: UpdateTranscriptInput): Promise<void>`
Update an existing transcript.

#### `deleteTranscript(id: string): Promise<void>`
Soft delete a transcript.

#### `copyTranscript(id: string): Promise<void>`
Duplicate a transcript.

#### `refreshTranscripts(): Promise<void>`
Refresh the transcripts list from database.

### Service Functions

All context methods use these underlying service functions:

- `fetchTranscripts()` - Get all transcripts
- `fetchTranscriptById(id)` - Get single transcript
- `searchTranscripts(query)` - Search by text
- `getTranscriptsByFolder(folderName)` - Filter by folder
- `getTranscriptsByTag(tag)` - Filter by tag

---

## 🎨 Component Architecture

### TranscriptsProvider
- Manages global state
- Handles real-time subscriptions
- Provides context to children

### TranscriptsLayout
- Main container component
- Responsive sidebar + content
- Mobile sheet for sidebar

### TranscriptsSidebar
- Browse transcripts by folder
- Search functionality
- Quick stats and metadata

### TranscriptViewer
- Display and edit transcript
- Integration with AdvancedTranscriptViewer
- Metadata editing

### TranscriptToolbar
- Action buttons (save, copy, delete, export)
- Dropdown for additional actions

### ImportTranscriptModal
- Import AI-generated transcripts
- Configure title, folder, source type
- Preview segment count and duration

---

## 🔄 Integration with AI Transcripts

The system seamlessly integrates with the existing `AdvancedTranscriptViewer` component:

1. **AI generates transcript** → Displayed in TranscriptBlock
2. **User clicks "Import"** → Opens ImportTranscriptModal
3. **Segments parsed** → From markdown format to structured data
4. **User configures** → Title, description, folder, etc.
5. **Import** → Saved to database via transcriptsService
6. **View in /transcripts** → Full editing capabilities

### Supported Input Format

```markdown
## Audio Transcription

[00:00] **Speaker A**: Welcome to the meeting.

[00:15] **Speaker B**: Thanks for having me.

[00:30] **Speaker A**: Let's discuss the project timeline.
```

---

## 🎯 Best Practices

### Organizing Transcripts
- Use descriptive titles with dates
- Leverage folders for categorization
- Add relevant tags for searchability
- Fill in descriptions for context

### Performance
- Segments stored as JSONB for efficient querying
- Indexes on common filter columns
- Real-time subscriptions are lightweight

### Storage Integration
- Store audio/video files in Supabase Storage
- Reference them via `audio_file_path` or `video_file_path`
- Use public URLs for playback

---

## 🐛 Troubleshooting

### "Table doesn't exist" error
- Run the migration SQL file
- Check Supabase table browser

### Import not working
- Verify transcript format matches expected structure
- Check browser console for errors
- Ensure user is authenticated

### Real-time not updating
- Check Supabase real-time is enabled for `transcripts` table
- Verify RLS policies allow user access

---

## 📊 Feature Comparison

| Feature | AI Transcript Block | Transcripts System |
|---------|---------------------|-------------------|
| View transcripts | ✅ | ✅ |
| Edit segments | ✅ | ✅ |
| Search | ✅ | ✅ |
| Export | ✅ | ✅ |
| Database persistence | ❌ | ✅ |
| Organize by folders | ❌ | ✅ |
| Tags | ❌ | ✅ |
| Full-text search | ❌ | ✅ |
| Copy/Duplicate | ❌ | ✅ |
| File references | ❌ | ✅ |
| Real-time sync | ❌ | ✅ |

---

## 🚀 Future Enhancements

- [ ] Audio/video player integration
- [ ] Automatic speaker diarization
- [ ] Transcript versioning
- [ ] Collaborative editing
- [ ] Export to multiple formats (SRT, VTT, PDF)
- [ ] AI-powered summaries
- [ ] Integration with meeting scheduling
- [ ] Bulk import from file uploads

---

## 📄 License

Part of AI Matrx Admin application.

---

## 🤝 Contributing

When adding features:
1. Update types in `types.ts`
2. Add service methods in `transcriptsService.ts`
3. Update context if needed
4. Add/modify components
5. Update this README

---

**Happy transcribing! 🎙️**

