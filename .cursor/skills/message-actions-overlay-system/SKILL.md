---
name: message-actions-overlay-system
description: Instance-based Redux overlay system for message action sub-modals (Save to Notes, Email, Auth Gate, Editor, History, HTML Preview, Submit Feedback, Announcements, User Preferences). Use when adding new message actions, modifying the MessageOptionsMenu, working with AssistantActionBar or AssistantMessage components, fixing overlay stacking or z-index issues in chat UIs, or extending the message action registry with new items.
---

# Message Actions Overlay System

## Problem this solves

Message action sub-modals (QuickSaveModal, EmailInputDialog, etc.) used to render **inside** `MessageOptionsMenu`. When the `AdvancedMenu` closed (`closeOnAction`), the entire subtree unmounted — killing any open sub-modal. This system decouples sub-modal rendering from the menu lifecycle by moving overlays to an app-root controller driven by Redux state.

---

## Architecture — three layers

```
AssistantActionBar (any instance on page)
  ├── registers/unregisters instance in Redux on mount/unmount
  └── MessageOptionsMenu
        └── calls getMessageActions(context) → MenuItem[]
              └── overlay actions dispatch messageActionsActions.openOverlay()

Redux: messageActionsSlice
  ├── instances: Record<string, MessageActionInstance>
  └── openOverlays: MessageActionOverlay[]  (stack-ordered)

ClientOverlayProvider (app root)
  ├── OverlayController (general app overlays)
  └── MessageActionsController
        └── reads openOverlays → renders corresponding components
              QuickSaveModal | EmailInputDialog | AuthGateDialog
              FullScreenMarkdownEditor | ContentHistoryViewer | HtmlPreviewBridge
              FeedbackDialog | AnnouncementsViewer | VSCodePreferencesModal
```

**Critical design constraint:** There is never a single "active" message. Multiple chat instances (main chat, floating assistant, sheets, inline dialogs) coexist on a page. Everything is keyed by a caller-generated `instanceId`, never singleton.

---

## File map

| File | Role |
|------|------|
| `features/cx-conversation/redux/messageActionsSlice.ts` | Redux slice — state, actions, selectors |
| `features/cx-conversation/actions/messageActionRegistry.ts` | Pure function returning `MenuItem[]` for a context |
| `features/cx-conversation/components/MessageActionsController.tsx` | App-root renderer for open overlays |
| `features/cx-conversation/components/HtmlPreviewBridge.tsx` | Adapter wiring `useHtmlPreviewState` to the controller |
| `features/cx-conversation/MessageOptionsMenu.tsx` | Thin bridge: reads Redux instance, calls registry, renders AdvancedMenu |
| `features/cx-conversation/AssistantActionBar.tsx` | Registers instance on mount, renders action buttons + menu |
| `features/cx-conversation/AssistantMessage.tsx` | Renders message content + action bar |
| `components/overlays/ClientOverlayProvider.tsx` | Mounts both OverlayController and MessageActionsController |
| `components/user-preferences/VSCodePreferencesModal.tsx` | VSCode-style preferences modal with left sidebar nav |
| `components/layout/AnnouncementsViewer.tsx` | Dialog listing active system announcements |
| `features/cx-conversation/redux/__tests__/messageActionsSlice.test.ts` | 20 reducer+selector tests |
| `features/cx-conversation/redux/__tests__/messageActionRegistry.test.ts` | 22 registry output tests |

---

## Redux state shape

```typescript
interface MessageActionsState {
  instances: Record<string, MessageActionInstance>;
  openOverlays: MessageActionOverlay[];  // stack-ordered, newest last
}

interface MessageActionInstance {
  content: string;
  messageId: string;
  sessionId: string;
  conversationId: string | null;
  rawContent: unknown[] | null;
  metadata: Record<string, unknown> | null;
}

interface MessageActionOverlay {
  instanceId: string;
  overlay: MessageActionOverlayType;
  data?: Record<string, unknown>;
}

type MessageActionOverlayType =
  | 'saveToNotes' | 'emailDialog' | 'authGate'
  | 'fullScreenEditor' | 'contentHistory' | 'htmlPreview'
  | 'submitFeedback' | 'announcements' | 'userPreferences';
```

**Selectors** (all take `(state, ...)` — never assume RootState):
- `selectMessageActionInstance(state, id)` → instance or undefined
- `selectOpenOverlays(state)` → full stack
- `selectOverlaysForInstance(state, instanceId)` → filtered
- `selectIsMessageActionOverlayOpen(state, instanceId, overlay)` → boolean
- `selectMessageActionOverlayData(state, instanceId, overlay)` → data payload

---

## How to add a new overlay type

### Step 1: Add the type

In `messageActionsSlice.ts`, extend `MessageActionOverlayType`:

```typescript
export type MessageActionOverlayType =
  | 'saveToNotes' | 'emailDialog' | 'authGate'
  | 'fullScreenEditor' | 'contentHistory' | 'htmlPreview'
  | 'submitFeedback' | 'announcements' | 'userPreferences'
  | 'yourNewOverlay';  // ← add here
```

### Step 2: Add the renderer

In `MessageActionsController.tsx`, add a dynamic import and a case to `OverlayRenderer`:

```typescript
const YourNewComponent = dynamic(
  () => import('@/path/to/YourNewComponent'),
  { ssr: false },
);

// Inside the switch:
case 'yourNewOverlay':
  return (
    <YourNewComponent
      isOpen={true}
      onClose={close}
      content={instance.content}
      /* any data from entry.data */
    />
  );
```

### Step 3: Add the menu item

In `messageActionRegistry.ts`, add a `MenuItem` entry in the `getMessageActions` function:

```typescript
{
  key: 'your-new-action',
  icon: SomeIcon,
  iconColor: 'text-blue-500 dark:text-blue-400',
  label: 'Your Action',
  action: () => {
    dispatch(messageActionsActions.openOverlay({
      instanceId,
      overlay: 'yourNewOverlay',
      data: { /* optional data */ },
    }));
    onClose();
  },
  category: 'Actions',
  showToast: false,
},
```

### Step 4: Add tests

In `__tests__/messageActionsSlice.test.ts`, the existing tests cover the generic open/close behavior — no changes needed unless the new overlay has special lifecycle requirements.

In `__tests__/messageActionRegistry.test.ts`, add a test verifying the new item appears and dispatches correctly.

---

## How to add a new action button to AssistantActionBar

Direct action buttons (like, dislike, copy, speaker) live in `AssistantActionBar.tsx`. If the action needs a sub-modal, dispatch to Redux. If it's stateless, handle locally.

```typescript
// For a Redux-driven overlay:
const handleNewAction = () => {
  dispatch(messageActionsActions.openOverlay({
    instanceId,
    overlay: 'yourNewOverlay',
  }));
};

// For a stateless action:
const handleCopy = async () => { /* clipboard logic */ };
```

---

## How AssistantActionBar registers instances

```typescript
// On mount — single registration
useEffect(() => {
  dispatch(messageActionsActions.registerInstance({
    id: instanceId,
    context: { content, messageId, sessionId, ... },
  }));
  return () => {
    dispatch(messageActionsActions.unregisterInstance(instanceId));
  };
}, [instanceId, dispatch]);

// On prop changes — context stays current
useEffect(() => {
  dispatch(messageActionsActions.updateInstanceContext({
    id: instanceId,
    updates: { content, messageId, sessionId, ... },
  }));
}, [content, messageId, sessionId, ...]);
```

The `instanceId` is generated via `useId()` + `useRef` — stable across re-renders, unique per component instance.

---

## Auth gating pattern

The registry's `requireAuth` helper:
1. Checks `ctx.isAuthenticated`
2. If false: stores the action key + content in `sessionStorage` (`matrx_pending_post_auth_action`)
3. Opens the `authGate` overlay with feature name/description
4. Returns `false` (caller returns early)

After login redirect, `resumePendingAuthAction` checks sessionStorage and re-triggers the action.

---

## Z-index and stacking

No manual z-index is needed. The system works because:
- `MessageActionsController` renders **after** `OverlayController` in the DOM
- All overlay components (Radix Dialog/Sheet) portal to `document.body`
- DOM order determines stacking — later = higher
- The `openOverlays` array is stack-ordered (push on open, filter on close)
- `AdvancedMenu` at z-9999 closes **before** sub-modals render (the action dispatches to Redux, then menu closes)

---

## Two overlay systems (don't confuse them)

| System | Slice | Controller | For what |
|--------|-------|------------|----------|
| **General** | `lib/redux/slices/overlaySlice.ts` | `OverlayController.tsx` | App-wide overlays: Quick Notes/Tasks/Chat, Prompt Runner modals, toasts |
| **Message Actions** | `messageActionsSlice.ts` | `MessageActionsController.tsx` | Message-specific: Save to Notes, Email, Auth Gate, Editor, History, HTML Preview, Feedback, Announcements, Preferences |

The "Add to Tasks" action bridges both: it dispatches to the **general** `overlaySlice` (`openOverlay({ overlayId: 'quickTasks', data: ... })`) because QuickTasks is rendered by `OverlayController`.

---

## Legacy variants (not yet migrated)

These files still use the old local-state pattern. They have `@deprecated` comments:
- `features/chat/components/response/assistant-message/MessageOptionsMenu.tsx`
- `features/public-chat/components/PublicMessageOptionsMenu.tsx`

Active consumers of legacy variants:
- `features/prompts/components/builder/PromptAssistantMessage.tsx` → imports from `features/chat/`
- `features/prompts/components/builder/PromptSystemMessage.tsx` → imports from `features/chat/`
- `features/prompt-apps/components/PromptAppPublicRendererFastAPI.tsx` → imports `PublicMessageOptionsMenu`

**Do not delete** legacy files until these consumers are migrated.

---

## Known gaps (as of March 2026)

1. **`copy-word` is identical to `copy-docs`** in the registry — no Word-specific formatting applied
2. **`resumePendingAuthAction` has no test coverage** in the registry test file
3. **`data: any` in `overlaySlice`** — type safety gap at the general overlay boundary
4. **Stub actions** `convert-broker` and `add-docs` show "Coming soon" toasts
5. **`onContentChange` on `AssistantMessage`** is declared but never passed by any caller — vestigial prop

---

## Running tests

```bash
npx jest --config jest.config.js.ts features/cx-conversation/redux/__tests__/ --no-cache
```

Outputs: 42 tests (20 slice + 22 registry), all passing.

---

## Checklist for changes

Before merging any change to this system:

- [ ] New overlay type added to `MessageActionOverlayType` union?
- [ ] Dynamic import added to `MessageActionsController`?
- [ ] Case added to `OverlayRenderer` switch?
- [ ] Menu item added to `getMessageActions` in registry?
- [ ] Tests updated for new state transitions or menu items?
- [ ] No manual z-index added to any overlay component?
- [ ] `instanceId` used (never global "active message" singleton)?
- [ ] `onClose` called in the action callback (menu must close before overlay opens)?
- [ ] Legacy variants left untouched (unless migrating their consumers)?
