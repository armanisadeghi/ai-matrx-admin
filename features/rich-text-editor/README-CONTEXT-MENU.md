# Rich Text Editor Context Menu

## Overview
The rich text editor now includes a right-click context menu that allows users to insert predefined content blocks at the cursor position.

## Features

### Content Block Categories

1. **Structure** (📄)
   - Heading 1, 2, 3
   - Paragraph
   - Bullet List
   - Numbered List
   - Checklist

2. **Formatting** (🎨)
   - Code Block
   - Inline Code
   - Quote Block
   - Divider

3. **Special** (✨)
   - Table template
   - Current Date
   - Timestamp
   - Info/Warning/Tip Notes
   - TODO Item
   - Comment

### Quick Access
The menu also includes a "Quick Insert" section with the most commonly used blocks for faster access.

## Usage

### For Users
1. Right-click anywhere in the editor
2. Navigate through the categorized submenus (Structure, Formatting, Special)
3. Click on any content block to insert it at your cursor position
4. Or use the Quick Insert section for common blocks

### For Developers

#### Basic Integration
The context menu is automatically integrated into the `RichTextEditor` component. No additional setup required!

#### Adding Custom Content Blocks
Edit `features/rich-text-editor/config/contentBlocks.ts`:

```typescript
{
    id: 'my-custom-block',
    label: 'My Custom Block',
    description: 'Description of what this does',
    icon: YourLucideIcon,
    category: 'structure', // or 'formatting' or 'special'
    template: 'Your template text here\n',
}
```

#### Customizing the Menu
The context menu component is located at:
`features/rich-text-editor/components/EditorContextMenu.tsx`

You can:
- Modify the menu structure
- Add new menu sections
- Change styling
- Add additional functionality (e.g., editor commands)

#### Text Insertion Utilities
The `insertTextUtils.ts` file provides utility functions:

- `insertTextAtCursor(editorId, text)` - Insert text at current cursor position
- `getCursorPosition(editorId)` - Get current cursor position info
- `saveCursorPosition()` - Save cursor position for later restoration
- `restoreCursorPosition(range)` - Restore a saved cursor position

## Architecture

### Files Created
1. `config/contentBlocks.ts` - Content block definitions
2. `utils/insertTextUtils.ts` - Text insertion utilities
3. `components/EditorContextMenu.tsx` - Context menu component

### Integration
The `EditorContextMenu` wraps the contentEditable div in `RichTextEditor.tsx` and handles:
- Right-click events
- Block selection
- Text insertion
- Content update notifications

## Extending

### Adding Menu Actions
You can add non-insertion actions to the context menu, such as:
- Format selected text
- Clear formatting
- Insert image/link
- Editor commands

Just add new menu items to the `EditorContextMenu` component and implement the handlers.

### Dynamic Templates
Content block templates can be dynamic (like the date/timestamp blocks). Use functions or computed values in the template field.

## Dark Mode
The context menu fully supports light and dark themes with proper color variations for all UI elements.

