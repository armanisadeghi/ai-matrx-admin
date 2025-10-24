# Rich Text Editor Components

This directory contains rich text editor components built with Remirror/ProseMirror.

## Components

### RemirrorEditor
A full-featured rich text editor with:
- Formatting toolbar (Bold, Italic, Underline, etc.)
- Markdown support
- Resizable editor area
- Keyboard shortcuts (Ctrl+S/Cmd+S to save)

### MarkdownDualDisplay
A split-view markdown editor showing:
- Live markdown editor on the left
- Real-time HTML preview on the right
- Adjustable split ratio

## Recent Updates

### Command Fixes & Feature Improvements (Oct 2024)
Fixed all toolbar commands to use correct Remirror API with beautiful ShadCN dialogs:
- **Links**: Beautiful modal dialog with URL and optional link text fields
  - No more browser prompts that break the theme!
  - Proper form validation and keyboard navigation
  - Theme-aware styling (light/dark mode)
- **Images**: Elegant modal dialog for image insertion
  - URL input with image preview capability
  - Optional alt text for accessibility
  - Theme-aware styling
- **Tables**: Changed from `createTable` to `insertTable`
- **Code Blocks**: Added separate button for code blocks (`toggleCodeBlock`)
- **Lists**: Fixed CSS to properly display bullets and numbers
  - Bullet lists show disc markers (nested: circle, square)
  - Numbered lists show decimal numbers (nested: letters, roman numerals)
- **Tooltips**: Added descriptive labels to all toolbar buttons
- **Theme Stability**: Dialogs no longer disrupt light/dark mode detection

### Line Spacing Control (Oct 2024)
Added adjustable line spacing with options for 1x, 1.5x, and 2x spacing:
- Default is now single line spacing (1x) instead of 1.6x
- Toggle button with icon in toolbar (RemirrorEditor) or top-right corner (MarkdownDualDisplay)
- Smooth transitions between spacing options
- Persists during editing session
- List items respect line spacing setting

### Dark Mode Fix (Oct 2024)
Properly integrated with the application's theme system:
- Uses `useTheme()` from `@/styles/themes/ThemeProvider`
- Applies `data-theme` attribute for consistent dark mode detection
- All editor elements (code blocks, tables, blockquotes) respect the theme
- Cursor remains visible in both light and dark modes

### Cursor and Interaction Fix (Oct 2024)

**Problem:**
The editors had cursor interaction issues where:
- Cursor didn't show properly
- Clicking only worked on the first line
- The editor didn't behave like a proper rich text editor (Google Docs, etc.)
- The entire editing area wasn't clickable

**Solution:**
Created `remirror-editor.css` with comprehensive styling for the ProseMirror editor:

1. **Full Area Clickable**: 
   - Added `cursor: text` to the entire editor area
   - Made the editor wrapper handle click events to focus the editor
   - Added proper padding and min-height to ProseMirror content

2. **Cursor Visibility**:
   - Added explicit cursor styling with `caret-color: currentColor`
   - Added blinking animation for the cursor
   - Ensured proper cursor display in both light and dark modes

3. **Editor Behavior**:
   - Added click handler that focuses the editor when clicking anywhere
   - Proper sizing for empty paragraphs to maintain clickable space
   - Google Docs-like interaction model

4. **Component Structure**:
   ```tsx
   <div className="remirror-editor-wrapper">
     <Remirror manager={manager} initialContent={state} autoFocus>
       <EditorContent /> {/* Custom wrapper with click handler */}
     </Remirror>
   </div>
   ```

### Key CSS Classes & Variables

- `.remirror-editor-wrapper`: Outer container with proper box model
- `.remirror-editor`: Makes the editor area act like a document
- `.remirror-editor-clickable`: Ensures the entire area is interactive
- `.remirror-editor .ProseMirror`: The actual ProseMirror editing area with proper styling
- `--editor-line-height`: CSS variable for adjustable line spacing (default: 1)
- `[data-theme="dark"]`: Dark mode styles applied via data attribute

### Implementation Pattern

For any Remirror editor:
1. Import `'remirror/styles/all.css'`
2. Import `'./remirror-editor.css'`
3. Wrap `EditorComponent` in a div with click handler:
   ```tsx
   const EditorContent = () => {
     const commands = useCommands();
     const handleClick = () => commands.focus();
     
     return (
       <div onClick={handleClick} className="remirror-editor remirror-editor-clickable w-full h-full">
         <EditorComponent />
       </div>
     );
   };
   ```

## Usage

```tsx
import RemirrorEditor from '@/components/rich-text-editor/RemirrorEditor';
import MarkdownDualDisplay from '@/components/rich-text-editor/MarkdownDualDisplay';

// Basic editor
<RemirrorEditor />

// Markdown editor with preview
<MarkdownDualDisplay />
```

## Features

### Editor Functionality
- ✅ **Full clickable area** - Click anywhere to start typing
- ✅ **Proper cursor display** - Visible cursor with blinking animation
- ✅ **Dark mode support** - Seamlessly integrates with app theme
- ✅ **Adjustable line spacing** - Toggle between 1x, 1.5x, and 2x
- ✅ **Keyboard shortcuts** - Ctrl+S/Cmd+S to save
- ✅ **Resizable editor** - Drag to adjust height
- ✅ **Undo/Redo** - Full history support

### Text Formatting
- ✅ **Bold** - Make text bold
- ✅ **Italic** - Italicize text
- ✅ **Underline** - Underline text
- ✅ **Headings** - H1, H2, H3 (with proper sizing)
- ✅ **Lists** - Bullet lists (•, ○, ■) and numbered lists (1, a, i)
- ✅ **Blockquotes** - Styled quote blocks
- ✅ **Inline Code** - Inline code formatting with background
- ✅ **Code Blocks** - Multi-line code blocks with syntax styling

### Rich Content
- ✅ **Links** - Insert links with URL prompt
- ✅ **Images** - Insert images with URL prompt
- ✅ **Tables** - Insert 3x3 tables (expandable)
- ✅ **Horizontal Rules** - Visual separators

### Special Views
- ✅ **Markdown support** - Full markdown syntax support
- ✅ **Split view** - Live preview in MarkdownDualDisplay
- ✅ **Real-time preview** - See formatted output as you type

## Technical Details

- Both editors use the ThemeProvider (`@/styles/themes/ThemeProvider`) for theme detection
- Line spacing uses CSS variables for dynamic updates
- The CSS file uses HSL color variables for theme compatibility
- All editors are client-side only (use `dynamic` import with `ssr: false`)
- Dark mode is applied via `data-theme` attribute for reliable detection

