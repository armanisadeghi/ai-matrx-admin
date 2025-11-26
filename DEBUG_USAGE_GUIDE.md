# Debug Features Usage Guide

## 🚀 Quick Start

### 1. Enable Debug Mode

**Option A: Keyboard Shortcut**
- Press `Cmd/Ctrl + Shift + D` (if configured)

**Option B: UI Toggle**
- Go to demo page: `/demo/component-demo/ai-prog/direct`
- Click "Debug Mode OFF" button in sidebar
- Button turns blue and says "Debug Mode ON"

---

## 🔍 What You'll See

### Debug Buttons Above Input

Once debug mode is enabled, you'll see **blue buttons appear above the input field**:

```
┌─────────────────────────────────────────────┐
│  [Debug State]  [Resources (2)]             │  ← These buttons appear here
├─────────────────────────────────────────────┤
│ Variables Section (if applicable)           │
├─────────────────────────────────────────────┤
│ Resource Chips (if attached)                │
├─────────────────────────────────────────────┤
│ Type your message...                        │
│                                             │
├─────────────────────────────────────────────┤
│ [Mic] [Resources] [Send]                    │
└─────────────────────────────────────────────┘
```

**Two Debug Buttons:**

1. **"Debug State"** (Blue) - Always visible in debug mode
   - Click to open **Execution State Debug Panel**
   - Shows complete Redux state
   - Shows exact API payload
   
2. **"Resources (N)"** (Green) - Only when resources attached
   - Click to open **Resource Debug Indicator**
   - Shows resource details
   - Preview complete message

---

## 🎯 Using Debug State Panel

### Opening the Panel

1. Enable debug mode
2. Click **"Debug State"** button above input
3. Panel slides in from right side

### What You See

**Always Visible: Overview**
- Current mode (Mode 1 or Mode 2)
- Status (idle, executing, completed)
- Message count
- Resource count
- Variable count
- Model being used

**Expandable Sections:**

#### 1️⃣ Template Messages
- Shows the initial prompt template
- System message
- Assistant prompts (if any)
- User template (marked if will be replaced)
- Copy to clipboard

**When to check:**
- Mode 1 (first message)
- Verify template is correct
- Check variable placeholders `{{variable_name}}`

#### 2️⃣ Conversation History
- Shows all messages exchanged
- User messages
- Assistant responses
- Timestamps
- Complete content

**When to check:**
- Mode 2 (ongoing conversation)
- Verify message history
- See what context LLM has

#### 3️⃣ Current State Details
- **Current Input:** What you're typing
- **Variables:** All merged variables and values
- **Resources:** All attached resources
- **UI State:** Variable visibility, expanded states

**When to check:**
- Before sending a message
- Verify variables are set correctly
- Check resources are attached

#### 4️⃣ API Payload (MOST IMPORTANT) ⭐
- Shows **EXACTLY** what will be sent to LLM
- System message with variables replaced
- All conversation messages
- Format matches API structure
- Character count and stats

**When to check:**
- To see what LLM actually sees
- Debug unexpected responses
- Verify variable replacement
- Check message structure

---

## 🧪 Testing Scenarios

### Scenario 1: First Message (Mode 1)

**Steps:**
1. Enable debug mode
2. Select a prompt with variables
3. Fill in variables
4. Type additional message
5. Attach resources (optional)
6. Click **"Debug State"**

**What to verify:**
- ✅ Overview shows "Mode 1 (First)"
- ✅ Template Messages section shows your prompt
- ✅ Current State Details shows variables filled
- ✅ API Payload shows template + your input + resources
- ✅ Variables are replaced in final message

### Scenario 2: Ongoing Conversation (Mode 2)

**Steps:**
1. Already have messages exchanged
2. Type new message
3. Attach resources (optional)
4. Click **"Debug State"**

**What to verify:**
- ✅ Overview shows "Mode 2 (Chat)"
- ✅ Conversation History shows all previous messages
- ✅ Current State Details shows new input
- ✅ API Payload shows complete conversation + new message
- ✅ Variables section is hidden (not applicable)

### Scenario 3: Resource Preview

**Steps:**
1. Attach one or more resources (files, notes, etc.)
2. Green **"Resources (N)"** button appears
3. Click it
4. Small indicator shows resource list
5. Click **"Preview Message"**

**What to verify:**
- ✅ Resources are listed by type
- ✅ Preview shows complete message
- ✅ Resources formatted as XML
- ✅ Message wraps properly (no overflow)
- ✅ Copy button works

---

## 🐛 Common Issues & Solutions

### "I don't see any debug buttons"

**Check:**
1. Is debug mode enabled? (Button should say "Debug Mode ON")
2. Is the input field visible? (Not in response state)
3. Refresh the page after enabling debug mode
4. Check browser console for errors

**Solution:**
- Make sure you're on a page with `SmartPromptInput` component
- Try toggling debug mode off and on again

### "Debug State button doesn't open panel"

**Check:**
1. Is runId available? (Component initialized)
2. Check browser console for errors

**Solution:**
- Wait for editor to finish initializing
- Try clicking again after a moment

### "Resources button not showing"

**Expected behavior:**
- Resources button only appears when resources are attached
- Attach a file, note, or other resource first

### "Message preview runs off screen"

**Fixed!** ✅
- Preview now has max height and scrolls
- Content wraps properly
- Copy button always visible

### "Variables not being replaced"

**Debug steps:**
1. Open Debug State panel
2. Check "Current State Details" → Variables
3. Verify variable names match template `{{name}}`
4. Check "API Payload" to see if replacement happened

**Common causes:**
- Variable name mismatch (case-sensitive)
- Variable not in merged variables
- Template doesn't have `{{variable_name}}` format

---

## 💡 Pro Tips

### 1. Use Debug State Panel for Every Test

Before sending any message, open the debug panel to verify:
- Variables are correct
- Resources are attached
- Message structure is as expected
- API payload looks right

### 2. Copy Sections for Documentation

Use the copy buttons to:
- Save examples of working prompts
- Document issues with exact payloads
- Share with team for review

### 3. Compare Mode 1 vs Mode 2

Open debug panel:
- **First message:** See Mode 1 behavior
- **Send message**
- **Second message:** See Mode 2 behavior
- Notice how template disappears and conversation history is used

### 4. Check Resources Attachment

When resources don't seem to work:
1. Open "Resources" button (green)
2. Verify resources are listed
3. Click "Preview Message"
4. Check XML formatting
5. Verify resources appear in final message

### 5. Debug Variable Issues

When variables don't replace:
1. Open Debug State panel
2. Go to "Current State Details" → Variables
3. Check exact variable names and values
4. Go to "API Payload"
5. Verify replacement happened correctly

---

## 📊 What Each Section Tells You

### Overview = Quick Health Check
- ✅ Green = Everything configured
- ⚠️ Check specific sections if something seems off

### Template Messages = Your Prompt Structure
- What the LLM was designed to do
- Initial context and instructions

### Conversation History = Chat Context
- What the LLM remembers
- Full conversation so far

### Current State = Right Now
- What's about to be sent
- What you've configured

### API Payload = Ground Truth
- **This is exactly what LLM sees**
- Use this for debugging
- Compare expected vs actual

---

## 🎓 Learning the System

### Beginner: Start Simple

1. Enable debug mode
2. Type a simple message
3. Open Debug State panel
4. Look at "API Payload" section
5. See how your message appears

### Intermediate: Add Complexity

1. Use a prompt with variables
2. Fill in variables
3. Open Debug State panel
4. Check "Template Messages"
5. Check "API Payload"
6. See how variables replaced

### Advanced: Full Features

1. Use template with variables
2. Attach multiple resources
3. Open both debug panels
4. Verify complete message structure
5. Send and continue conversation
6. See Mode 1 → Mode 2 transition

---

## 🚨 When to Use Which Debug Tool

### Use Debug State Panel When:
- ❓ "What's in Redux state?"
- ❓ "What will the LLM see?"
- ❓ "Are my variables set correctly?"
- ❓ "Is conversation history correct?"
- ❓ "What mode am I in?"

### Use Resource Debug When:
- ❓ "Are my resources attached?"
- ❓ "How are resources formatted?"
- ❓ "What does the complete message look like?"
- ❓ "Is the XML structure correct?"

### Use Both When:
- 🐛 Debugging complex issues
- 📝 Documenting behavior
- 🧪 Testing new features
- 👥 Showing team how system works

---

## ✅ Success Indicators

You're using debug features correctly when:

- ✅ You check Debug State before sending messages
- ✅ You verify API Payload matches expectations
- ✅ You understand Mode 1 vs Mode 2 differences
- ✅ You can explain what LLM actually sees
- ✅ You catch issues before sending

---

## 📚 Related Documentation

- `/MODE_TRANSITION_ARCHITECTURE.md` - Mode 1 vs Mode 2 details
- `/ANALYSIS_AND_FIXES.md` - Bug fixes and architecture
- `/components/debug/README.md` - Debug components reference
- `/lib/redux/prompt-execution/README.md` - Redux architecture

---

## Need Help?

1. **Check API Payload section first** - Shows ground truth
2. **Compare with expected behavior** - Is it different?
3. **Check each section** - Where does it diverge?
4. **Copy relevant sections** - Share for help
5. **Check console** - Any errors logged?

**Remember:** The Debug State Panel shows you **exactly** what Redux knows and what the LLM will see. If something seems wrong, the answer is in that panel!

