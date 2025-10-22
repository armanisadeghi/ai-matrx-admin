# Chat Layout with Canvas Integration 🚀

## Overview
The chat interface now uses the powerful `AdaptiveLayout` system with full canvas support, providing a professional, feature-rich experience for AI conversations.

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         ChatHeader                              │
├──────────┬────────────────────────────────┬─────────────────────┤
│          │                                │                     │
│  Chat    │      Main Chat Area            │   Canvas Panel      │
│ Sidebar  │   (ResponseColumn)             │   (Interactive)     │
│          │                                │                     │
│ 296px    │   • Messages                   │   • Quizzes         │
│ (or 56px │   • Streaming responses        │   • Presentations   │
│ collapsed)│  • User input                  │   • HTML Preview    │
│          │   • Tool updates               │   • Code Execution  │
│          │                                │   • Diagrams        │
│          │                                │   • And more!       │
│          │                                │                     │
└──────────┴────────────────────────────────┴─────────────────────┘
```

## Components

### 1. ChatSidebar (`ChatSidebar.tsx`)
- **Purpose**: Simplified conversation list for quick chat access
- **Features**:
  - Collapsible (296px → 56px)
  - Search functionality
  - "New Chat" button
  - Grouped conversations (Today, Yesterday, Last 7 days, etc.)
  - Load more pagination
  - Collapsed view shows avatar icons
- **Props**:
  - `isCollapsed?: boolean` - Controls sidebar state
  - `onToggleCollapse?: () => void` - Callback for collapse toggle

### 2. Chat Layout (`app/(authenticated)/chat/layout.tsx`)
- **Uses**: `AdaptiveLayout` component
- **Configuration**:
  - `leftPanelMaxWidth`: Dynamic (296px expanded, 56px collapsed)
  - `mobileBreakpoint`: 768px
  - Canvas automatically available via Redux
- **Features**:
  - Responsive design (mobile stacks vertically)
  - Smooth transitions
  - Canvas panel for interactive content
  - No scroll conflicts

## Features

### ✨ Collapsible Sidebar
- Click the chevron icon to collapse/expand
- Collapsed view shows conversation avatars
- Saves screen space for more chat content
- Smooth animation transitions

### 🎨 Canvas Integration
All interactive content from the chat automatically works with canvas:
- **Quizzes**: Click "Open in side panel" to practice while reading
- **Presentations**: View slides in canvas while seeing the conversation
- **HTML Code**: Preview HTML output without leaving the chat
- **Code Blocks**: Execute and see results in real-time
- **Diagrams**: Interact with flowcharts and diagrams
- **Flashcards**: Study in canvas while referencing chat content
- **And all other 12+ interactive block types!**

### 📱 Mobile Responsive
- Below 768px: Sidebar stacks on top
- Full-height scrolling on mobile
- Touch-friendly interface
- Canvas available on larger tablets

### 🔄 Smooth Scrolling
- Uses aggressive scroll-lock to prevent browser auto-scroll
- Smooth transitions between chats
- Maintains scroll position in each conversation
- No conflicts with canvas interactions

## Usage Examples

### Opening Interactive Content in Canvas

When the AI generates interactive content (quiz, presentation, diagram, etc.), users can click the purple "Side Panel" or "Preview" button to open it in the canvas:

```typescript
// This happens automatically via the canvas system
import { useCanvas } from '@/hooks/useCanvas';

const { open: openCanvas } = useCanvas();

// Example: Open a quiz in canvas
openCanvas({
  type: 'quiz',
  data: quizData,
  metadata: { title: 'JavaScript Quiz' }
});
```

### Toggling Sidebar Programmatically

```typescript
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

// Toggle sidebar
setIsSidebarCollapsed(!isSidebarCollapsed);
```

## Benefits

1. **Side-by-Side Viewing**: See your chat conversation and interactive content simultaneously
2. **Distraction-Free**: Collapse the sidebar for maximum chat/canvas space
3. **Quick Navigation**: Access recent conversations without losing your place
4. **Professional UI**: Clean, modern interface that scales with your workflow
5. **Zero Config**: Canvas integration works automatically with all interactive blocks

## Technical Details

### Layout Proportions
- **Sidebar**: 56px (collapsed) or 296px (expanded)
- **Chat Area**: Gets remaining space, content max-width 800px
- **Canvas**: 400-1175px (user-resizable), default 800px

### Performance
- Efficient Redux state management
- Optimized re-renders
- Smooth 60fps animations
- Lazy-loaded conversation lists

### Accessibility
- Keyboard navigation support
- ARIA labels on interactive elements
- Screen reader friendly
- High contrast mode support

## Future Enhancements

Potential additions:
- Pin favorite conversations
- Drag-and-drop conversation reordering
- Conversation folders/tags
- Search within conversation
- Export conversations
- Voice input integration
- Multi-select for bulk operations

---

**Built with ❤️ using Next.js, Redux, and Tailwind CSS**

