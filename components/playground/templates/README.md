# AI Cockpit Template System 🚀

## Overview

A comprehensive template management system for the AI Cockpit that provides **instant access to content blocks, pre-built workflows, and canvas-ready templates**. This system dramatically speeds up workflow creation by providing smart suggestions, favorites tracking, and one-click insertion.

---

## 🎯 Key Features

### 1. **Template Library Panel** (`TemplateLibraryPanel.tsx`)
Browse and insert content blocks directly from a beautiful side panel.

**Features:**
- ✨ **Smart Search** - Find templates by name, description, or tags
- 📁 **Category Organization** - Organized by structure, formatting, special, and AI prompts
- ⭐ **Favorites** - Star your most-used templates for quick access
- 🕐 **Recent Templates** - Automatic tracking of recently used templates
- 👁️ **Live Preview** - See template content before inserting
- 🎨 **Beautiful UI** - Clean, intuitive interface with dark mode support

**Usage:**
```typescript
import { TemplateLibraryPanel } from '@/components/playground/templates';

<TemplateLibraryPanel
    onInsertTemplate={(template) => {
        // Handle template insertion
    }}
    onPreviewTemplate={(template) => {
        // Handle preview
    }}
/>
```

---

### 2. **Quick Template Insert Button** (`QuickTemplateInsertButton.tsx`)
Add this to any toolbar for instant template access.

**Features:**
- 🧠 **Smart Suggestions** - Context-aware suggestions based on message role (system/user/assistant)
- 🕐 **Recent Templates** - Quick access to recently used
- 📂 **Categorized Dropdown** - Hierarchical menu organized by category
- ⚡ **Fast Insertion** - One-click template insertion

**Usage:**
```typescript
import { QuickTemplateInsertButton } from '@/components/playground/templates';

<QuickTemplateInsertButton
    onInsert={(template) => {
        // Insert template into editor
    }}
    messageRole="system" // For smart suggestions
    variant="ghost"
    size="sm"
/>
```

**Smart Suggestions by Role:**
- **System Messages**: Thinking templates, AI prompts, instructions
- **User Messages**: Questions, requests, inputs
- **Assistant Messages**: Flashcards, quizzes, timelines, research, diagrams

---

### 3. **Recipe Templates Gallery** (`RecipeTemplatesGallery.tsx`)
Pre-built workflow templates for common use cases.

**Built-in Templates:**
1. **Code Review Assistant** - Comprehensive code review with security analysis
2. **Deep Research Assistant** - Structured research with citations
3. **Professional Content Writer** - SEO-optimized content creation
4. **Interactive Learning Tutor** - Personalized tutoring with quizzes
5. **Creative Brainstorming Partner** - Innovation and idea generation
6. **Business Strategy Consultant** - Strategic analysis and planning

**Features:**
- 🔍 **Search & Filter** - Find templates by category or keywords
- 📊 **Difficulty Levels** - Beginner, Intermediate, Advanced
- 🎯 **Use Case Categories** - Development, Writing, Research, Education, Business, Creative
- 📝 **Full Preview** - See all messages and settings before using
- ⚙️ **Recommended Settings** - Pre-configured model settings for optimal results

**Usage:**
```typescript
import { RecipeTemplatesGallery } from '@/components/playground/templates';

<RecipeTemplatesGallery
    onSelectTemplate={(template) => {
        // Create new recipe from template
        // template includes: name, description, messages[], settings
    }}
/>
```

---

### 4. **Canvas Quick Actions** (`CanvasQuickActions.tsx`)
Generate canvas-ready interactive content with one click.

**Available Actions:**
- 📝 **Multiple Choice Quiz** - Interactive quizzes with explanations
- 🃏 **Flashcard Set** - Study flashcards
- ⏱️ **Interactive Timeline** - Visual timelines with phases
- 📊 **Comparison Table** - Side-by-side comparisons
- 🌳 **Decision Tree** - Decision-making flowcharts
- 🔄 **Process Diagram** - Flowcharts and process maps
- 🔧 **Troubleshooting Guide** - Step-by-step problem resolution
- 📚 **Research Report** - Comprehensive research analysis
- 📈 **Progress Tracker** - Track learning or project progress

**Features:**
- 🎨 **Category Filtering** - Interactive, Visual, Analysis, Education
- 🎯 **One-Click Generation** - Templates insert directly into message
- 🖼️ **Visual Feedback** - Color-coded icons and cards
- 💡 **Usage Tips** - Inline help text

**Usage:**
```typescript
import { CanvasQuickActions } from '@/components/playground/templates';

<CanvasQuickActions
    onSelectAction={(action) => {
        // Insert canvas template
    }}
/>
```

---

### 5. **Template Preview Dialog** (`TemplatePreviewDialog.tsx`)
Beautiful modal for previewing templates before insertion.

**Features:**
- 👁️ **Live Preview Tab** - Rendered markdown preview
- 📄 **Raw View Tab** - See actual template code
- 📋 **Copy to Clipboard** - Copy template text
- ➕ **Insert Button** - Insert directly from preview
- 🎨 **Category Badges** - Visual category indicators

---

### 6. **Cockpit Templates Panel** (`CockpitTemplatesPanel.tsx`)
Integration component for using templates within the cockpit panels.

**Features:**
- 🔗 **Event-Based Integration** - Uses custom events for communication
- 💾 **LocalStorage Bridge** - Temporary storage for pending insertions
- 🔔 **Toast Notifications** - User feedback for actions
- 🎯 **Auto-insertion** - Templates ready to insert on focus

---

## 🎨 Integration Examples

### Adding Template Button to Message Toolbar

```typescript
import { QuickTemplateInsertButton } from '@/components/playground/templates';

function MessageToolbar({ messageRole, editorRef }) {
    const handleInsert = (template) => {
        // Get current cursor position
        const editor = editorRef.current;
        if (editor) {
            editor.insertText(template.template);
        }
    };

    return (
        <div className="flex gap-2">
            <QuickTemplateInsertButton
                onInsert={handleInsert}
                messageRole={messageRole}
                variant="ghost"
                size="sm"
            />
            {/* Other toolbar buttons */}
        </div>
    );
}
```

### Using Templates Panel in Cockpit

```typescript
import { CockpitTemplatesPanel } from '@/components/playground/templates';

// In your cockpit configuration
const panels = [
    { component: BrokerSidebar, label: 'Brokers' },
    { component: CockpitTemplatesPanel, label: 'Templates' },
    { component: ModelSettingsPanel, label: 'Settings' }
];
```

### Recipe Templates in Intro Screen

Already integrated! Click "Recipe Templates" on the AI Cockpit intro screen.

---

## 📊 Database Integration

The system automatically loads templates from the Supabase database using the `useDatabaseContentBlocks()` hook.

**Database Tables:**
- `content_blocks` - Individual content block templates
- `category_configs` - Category definitions
- `subcategory_configs` - Subcategory definitions

**Auto-refresh:** Templates automatically reload every 5 minutes to stay in sync.

**Fallback:** If database is unavailable, falls back to static templates from `contentBlocks.ts`.

---

## 🎯 Smart Features

### 1. Role-Based Suggestions
The system analyzes the message role and suggests relevant templates:
- **System role**: AI behavior, thinking processes, instruction templates
- **User role**: Question formats, request templates
- **Assistant role**: Output formats (quizzes, diagrams, reports)

### 2. Automatic Recent Tracking
Templates you use are automatically tracked in localStorage for quick re-access.

### 3. Favorites System
Star templates to save them to your favorites list for instant access.

### 4. Search Intelligence
Search across:
- Template names
- Descriptions
- Category names
- Tags
- Template IDs

---

## 🚀 Quick Start Guide

### For Users:

1. **Browse Templates:**
   - Click "Manage" button in cockpit sidebar
   - Search or filter by category
   - Preview templates before using

2. **Insert Template:**
   - Click "Insert" button
   - Click in any message editor
   - Template inserts at cursor position

3. **Use Recipe Template:**
   - Click "Recipe Templates" on intro screen
   - Browse pre-built workflows
   - Click "Use Template" to start

4. **Generate Canvas Content:**
   - Open Canvas Quick Actions
   - Select content type (quiz, timeline, etc.)
   - AI generates canvas-ready content

### For Developers:

1. **Import what you need:**
```typescript
import {
    TemplateLibraryPanel,
    QuickTemplateInsertButton,
    RecipeTemplatesGallery,
    CanvasQuickActions,
    TemplatePreviewDialog
} from '@/components/playground/templates';
```

2. **Add to your component:**
```typescript
<QuickTemplateInsertButton
    onInsert={(template) => {
        // Your insertion logic
    }}
    messageRole={currentRole}
/>
```

3. **Customize as needed:**
All components accept className and custom handlers.

---

## 📝 Adding New Templates

### Adding Content Blocks (Database):
Use the ContentBlocksManager at `/admin/content-blocks` to:
- Create new templates
- Edit existing ones
- Organize with categories/subcategories
- Set sort order and visibility

### Adding Recipe Templates (Code):
Edit `RecipeTemplatesGallery.tsx` and add to `recipeTemplates` array:

```typescript
{
    id: 'my-template',
    name: 'My Awesome Template',
    description: 'Description here',
    category: 'development',
    difficulty: 'intermediate',
    icon: <Code className="w-5 h-5" />,
    tags: ['tag1', 'tag2'],
    messages: [
        {
            role: 'system',
            label: 'System Instructions',
            content: 'Your system prompt here'
        },
        {
            role: 'user',
            label: 'User Input',
            content: 'User prompt template'
        }
    ],
    settings: {
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        maxTokens: 8000
    }
}
```

---

## 🎨 Styling & Theming

All components fully support:
- ✅ Light/Dark mode
- ✅ Tailwind CSS classes
- ✅ Custom className props
- ✅ Responsive design
- ✅ Accessible (ARIA labels)

---

## 🔧 Advanced Configuration

### Template Loading Options:

```typescript
import { useDatabaseContentBlocks } from '@/hooks/useContentBlocks';

// With auto-refresh
const { contentBlocks } = useDatabaseContentBlocks(true);

// Without auto-refresh
const { contentBlocks } = useDatabaseContentBlocks(false);

// Custom refresh interval
const { contentBlocks } = useContentBlocks({
    useDatabase: true,
    autoRefresh: true,
    refreshInterval: 10 * 60 * 1000 // 10 minutes
});
```

### Event System:

```typescript
// Listen for template insertion requests
window.addEventListener('templateInsertRequested', (e) => {
    const { template } = e.detail;
    // Handle insertion
});

// Dispatch custom insertion
window.dispatchEvent(new CustomEvent('templateInsertRequested', {
    detail: { template: myTemplate }
}));
```

---

## 🎯 Best Practices

1. **Template Organization:**
   - Use clear, descriptive names
   - Add helpful descriptions
   - Tag templates appropriately
   - Set correct categories

2. **Recipe Templates:**
   - Include clear instructions in system message
   - Provide example inputs in user message
   - Set appropriate model settings
   - Test templates before deploying

3. **Canvas Templates:**
   - Follow JSON schema exactly
   - Include examples in templates
   - Add explanatory comments
   - Test canvas rendering

4. **Performance:**
   - Templates load once and cache
   - Auto-refresh only when needed
   - LocalStorage for preferences
   - Lazy loading for dialogs

---

## 🐛 Troubleshooting

**Templates not loading:**
- Check database connection
- Verify Supabase configuration
- Check browser console for errors
- System falls back to static templates

**Insertion not working:**
- Verify editor has focus
- Check for console errors
- Ensure template format is correct
- Try copy/paste as fallback

**Smart suggestions not showing:**
- Verify messageRole prop is set
- Check if templates have correct categories
- Ensure database templates are loaded

---

## 📈 Future Enhancements

Potential additions:
- [ ] Template versioning
- [ ] Collaborative template sharing
- [ ] Template analytics (usage tracking)
- [ ] AI-powered template generation
- [ ] Template marketplace
- [ ] Custom template variables
- [ ] Template import/export
- [ ] Template categories customization

---

## 📞 Support

For issues or questions:
1. Check this README first
2. Review component prop types
3. Check browser console
4. Test with static templates
5. Reach out to development team

---

## 🎉 Summary

This template system transforms the AI Cockpit into a powerful, productivity-focused environment where users can:

✅ **Browse hundreds of templates** organized by category
✅ **Insert templates instantly** with one click
✅ **Start with proven workflows** using recipe templates
✅ **Generate canvas content** for interactive experiences
✅ **Track favorites and history** for personalized experience
✅ **Get smart suggestions** based on context
✅ **Preview before using** to ensure it's right
✅ **Manage everything** from a central location

**This is a game-changer for productivity!** 🚀

