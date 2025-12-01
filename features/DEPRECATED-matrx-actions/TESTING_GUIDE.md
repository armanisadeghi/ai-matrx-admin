# Testing the Live Matrx Actions System

## 🎉 Persian Translation is Now LIVE!

The system is now fully connected to the prompt execution engine. You can test the complete flow from action trigger to result display.

## 🧪 How to Test

### Step 1: Navigate to Demo Page

```
http://localhost:3000/demo/prompt-execution
```

### Step 2: Go to "Matrx Actions" Tab

Click the first tab (with the ⚡ Zap icon)

### Step 3: Test Persian Translation

1. **Select some text** in the demo content (e.g., "Artificial Intelligence")
2. **Right-click** to open the context menu
3. Navigate to **Translation → Persian**
4. Click **Persian**

### What Should Happen:

1. ✅ **Loading Toast** appears: "Executing: Translate to Persian"
2. ✅ **Execution Status Card** shows with spinning loader
3. ✅ **Streaming Text** appears in real-time as the AI responds
4. ✅ **Success Toast** appears: "Translate to Persian completed"
5. ✅ **Result Modal Opens** with the translated text
   - Copy button to copy result to clipboard
   - "Open in Canvas" button (coming soon)
   - Scrollable content area
   - Close button to dismiss

## 🔍 What's Being Tested

### Variable Resolution ✓
- System reads `text_to_translate` from `variableContextMap`
- Resolves from `context.selectedText`
- Falls back to `context.editorContent` if no selection

### Prompt Execution ✓
- Converts action to `PromptExecutionConfig`
- Calls existing `usePromptExecution` hook
- Uses Socket.IO streaming (same as PromptRunner)

### Result Handling ✓
- Displays streaming text in real-time
- Shows results in modal dialog
- Copy to clipboard functionality
- Clean, scrollable display
- Provides user feedback via toasts

## 🐛 Troubleshooting

### Action shows toast but doesn't execute

**Problem:** Action is clicked but nothing happens

**Check:**
1. Open browser console (F12)
2. Look for error messages
3. Verify prompt ID exists in database: `3446e556-b6c5-4322-960a-e36fe0eff17c`

**Fix:**
```sql
-- Verify prompt exists
SELECT id, name FROM prompts WHERE id = '3446e556-b6c5-4322-960a-e36fe0eff17c';
```

### "Required variable cannot be resolved" error

**Problem:** Error toast saying variable cannot be resolved

**Check:**
1. Did you select text before right-clicking?
2. Is the variable name in the action config correct?

**Fix:** The action is configured with fallback to `editor_content`, so this should work even without selection. If you see this error, check the action configuration in `system-actions.ts`.

### Streaming doesn't work

**Problem:** No streaming text appears

**Check:**
1. Socket.IO connection status in Redux DevTools
2. Network tab for WebSocket connection
3. Console for Socket.IO errors

**Fix:** This uses the same Socket.IO system as PromptRunner, so if PromptRunner works, this should too.

### Modal doesn't open

**Problem:** Execution completes but modal doesn't open

**Check:**
1. Look for `result` state in React DevTools
2. Check console for errors
3. Verify `execResult.text` has content

**Fix:** The modal should automatically open when execution completes and `result` is set. If you see the success toast but no modal, check the browser console.

## 📊 What to Observe

### In the Demo Page

1. **Statistics Card** - Shows 16 actions, 16 menu items
2. **Execution Status Card** - Appears when action is running
3. **Streaming Text** - Real-time AI response
4. **Last Action Card** - Shows action ID and selected text

### In Browser Console

```javascript
// You should see:
Action triggered: translate-persian { selectedText: "..." }
```

### In Redux DevTools

- Task creation in Socket.IO slice
- Streaming updates
- Response completion

## ✅ Success Criteria

- [x] Action menu displays correctly
- [x] Persian translation option appears
- [x] Click triggers execution
- [x] Loading state shows
- [x] Streaming text displays
- [x] Success notification appears
- [x] Result modal opens
- [x] Copy to clipboard works
- [x] Modal can be closed

## 🎯 Next Actions to Enable

Once Persian translation works, you can easily enable others by:

1. **Get prompt IDs** from your database
2. **Update `system-actions.ts`** with real IDs
3. **Match variable names** to your prompts
4. **Test each action** using this same flow

### Example: Enable "Summarize"

```typescript
{
  id: 'summarize',
  promptId: 'YOUR-SUMMARIZE-PROMPT-ID', // ← Add real ID
  variableContextMap: {
    text: { // ← Match your prompt's variable name
      source: 'selection',
      fallback: 'editor_content',
      required: true
    }
  }
}
```

## 🔧 Technical Details

### Flow Diagram

```
User Right-Clicks
    ↓
Context Menu Opens (MatrxActionsContextMenu)
    ↓
User Clicks "Persian"
    ↓
handleActionTrigger(actionId, context)
    ↓
useActionExecution.executeAction()
    ↓
Look up action by ID
    ↓
Validate context requirements
    ↓
Convert to PromptExecutionConfig
    ↓
Resolve variables (text_to_translate = selectedText)
    ↓
usePromptExecution.execute()
    ↓
Fetch prompt from database
    ↓
Replace variables in prompt messages
    ↓
Submit task via Socket.IO
    ↓
Stream response in real-time
    ↓
Show result in modal dialog
    ↓
User can copy or close
```

### Key Files

- **Action Definition:** `features/matrx-actions/constants/system-actions.ts`
- **Menu Configuration:** `features/matrx-actions/constants/system-menu-items.ts`
- **Variable Resolution:** `features/matrx-actions/utils/action-executor.ts`
- **Execution Hook:** `features/matrx-actions/hooks/useActionExecution.ts`
- **Demo Component:** `features/matrx-actions/examples/MatrxActionsDemo.tsx`

## 💡 Tips

1. **Test with different text lengths** - Short, medium, and long selections
2. **Test without selection** - Should use full editor content as fallback
3. **Watch the console** - Helpful for debugging
4. **Check Redux DevTools** - See the Socket.IO state changes
5. **Monitor Network tab** - Watch WebSocket messages

## 🚀 What's Next

Once this works:

1. Add more prompt IDs to other actions
2. Test non-prompt actions (functions, tools, workflows)
3. Build admin interface for managing actions
4. Add database persistence
5. Enable user custom actions
6. Add org/workspace scoped actions

## 📝 Notes

- Currently only **prompt-based actions** work
- Other action types (function, tool, workflow, api) will show "not supported" error
- Context sources other than `selection` and `editor_content` are planned for future
- Manual input will eventually show a modal dialog

---

**Ready to test?** Select some text, right-click, go to Translation → Persian, and watch the magic happen! 🎉

