# Where to Test the New Prompt Features

## 🎯 Main Demo Page

### Navigate to: `/demo/prompt-execution`

This page has **everything** you need to test!

---

## 🔧 What You'll See

### 1. **"Import Demo Prompts" Button** (Top Right)
Click this button to open the JSON import modal where you can:
- Paste JSON to create prompts
- See validation and success messages
- Navigate directly to newly created prompts

**To import the demo prompt:**
1. Click "Import Demo Prompts"
2. Copy the JSON from `features/prompts/DEMO_PROMPTS.json`
3. Paste it in the text area
4. Click "Import"
5. Done! Both prompts are created

---

## 📑 Three Demo Tabs

### Tab 1: **Text Analyzer**
- **What it shows**: Basic `usePromptExecution` hook usage
- **What you do**: 
  - Type or paste text
  - Click "Analyze Text"
  - Watch the streaming response
- **Uses**: Your prompt `176d3595-0d30-4e98-a73e-13de7654a408`
- **Variable**: `text` (from textarea)

### Tab 2: **Modal Demo**
- **What it shows**: Universal `PromptExecutionModal` component
- **What you do**:
  - Click "Text Analyzer" or "Demo (with defaults)"
  - Modal opens with auto-detected variables
  - Fill in variables (some pre-filled)
  - Click "Execute" and watch streaming
- **Uses**: Your text analyzer + a multi-variable demo prompt

### Tab 3: **Context Menu** ⭐ (YOUR REQUESTED FEATURE)
- **What it shows**: Right-click menu with multiple AI prompts
- **What you do**:
  1. Select text in the sample article
  2. Right-click on the selected text
  3. See grouped menu with options:
     - **Content**: Summarize, Improve Writing, Extract Key Points
     - **Translation**: Translate to Spanish, Translate to French
     - **Creative**: Generate Ideas
  4. Click any option to execute that prompt
- **Features**:
  - Grouped menu items (by category)
  - Icons for each option
  - Context-based variable resolution (selected text automatically passed)
  - Different output handlers (canvas, toast, etc.)

---

## 🎨 JSON Import UI Features

When you click "Import Demo Prompts":

### You'll see:
1. **Example/Help Card** (blue background)
   - Shows JSON format info
   - "Copy Example" button for quick template

2. **JSON Input Area**
   - Large textarea with syntax highlighting
   - Placeholder shows example format
   - Real-time validation

3. **Import Button** (gradient blue/purple)
   - Disabled until you paste valid JSON
   - Shows "Importing..." with spinner

### After Import:
4. **Results Display**
   - Green cards for successful imports
   - Red cards for errors
   - Each shows prompt name, ID, and "View" button
   - Summary: "X succeeded, Y failed"

---

## 🧪 How to Test Context Menu

### Quick Test:
1. Go to `/demo/prompt-execution`
2. Click "Context Menu" tab
3. Select text in the sample article
4. Right-click
5. Try any menu option!

### What Makes It Special:
- **Grouped Options**: Menu items are organized by category
- **Smart Variables**: Selected text automatically becomes the variable
- **Multiple Outputs**: 
  - Some open in canvas
  - Some show as toasts
  - Some return JSON
- **Icons**: Each option has a matching Lucide icon

---

## 📝 Create More Prompts Via JSON

### For the Context Menu to Work:
You need to create these prompts (or use the importer):

```json
{
  "prompts": [
    {
      "id": "summarize-text",
      "name": "Summarize",
      "messages": [
        {
          "role": "system",
          "content": "You are an expert at creating concise summaries."
        },
        {
          "role": "user",
          "content": "Summarize this:\n\n{{ text }}"
        }
      ],
      "variables": [{ "name": "text" }],
      "settings": { "temperature": 0.5 }
    },
    {
      "id": "improve-writing",
      "name": "Improve Writing",
      "messages": [
        {
          "role": "system",
          "content": "You are a professional editor. Improve the writing quality."
        },
        {
          "role": "user",
          "content": "Improve this text:\n\n{{ text }}"
        }
      ]
    }
  ]
}
```

### Steps:
1. Copy JSON above
2. Go to `/demo/prompt-execution`
3. Click "Import Demo Prompts"
4. Paste and import
5. Context menu will now work with these prompts!

---

## 🎯 Current Status

✅ **Working Now:**
- Text Analyzer demo (uses your prompt `176d3595...`)
- Modal demo 
- Context Menu demo UI
- JSON Import system

⚠️ **Needs Prompts Created:**
- Context Menu options need their prompts imported
- Use the JSON above or create manually

---

## 🚀 Quick Start (30 Seconds)

1. Navigate to: **`/demo/prompt-execution`**
2. Click: **"Import Demo Prompts"**
3. Open file: **`features/prompts/DEMO_PROMPTS.json`**
4. Copy all contents
5. Paste in modal
6. Click "Import"
7. Done! Try all 3 tabs

---

## 💡 Pro Tips

- **Test Text Analyzer first**: It uses your existing prompt, guaranteed to work
- **Import before testing Context Menu**: Context menu needs prompts to exist
- **Check the blue info card**: It tells you what prompts are needed
- **Use "View" button**: After import, click "View" to edit the prompt

---

## 📍 Navigation Path

From anywhere in the app:
1. Click **Demo** in sidebar (if not already there)
2. Find **"Prompt Execution System"** card
3. Click it
4. You're on the demo page!

---

## Need Help?

- **Full Docs**: `features/prompts/PROMPT_IMPORT_GUIDE.md`
- **Setup Guide**: `features/prompts/DEMO_SETUP.md`
- **Demo JSON**: `features/prompts/DEMO_PROMPTS.json`

