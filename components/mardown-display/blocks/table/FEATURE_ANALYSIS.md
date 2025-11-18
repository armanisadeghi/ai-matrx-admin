# Comprehensive Table Feature Analysis

## 🎯 CRITICAL REQUIREMENT
**ALL features are hidden during streaming (`isStreamActive || !metadata.isComplete`)**

Only when the table is complete do features "magically come to life"!

---

## 📊 Current Feature Inventory (MarkdownTable.tsx)

### 1. EXPORT FEATURES

#### A. Export Dropdown Menu (ExportDropdownMenu component)
**Location:** Lines 47-147  
**Behavior:**
- Hidden during streaming
- Waits 1 second after data stabilizes before showing
- Uses `setTimeout` with stability detection
- Clears timer on unmount

**Export Options:**
1. **Copy as Text** - Formatted markdown table to clipboard
2. **Copy as Markdown** - Raw markdown string  
3. **Copy as JSON** - Normalized data (only if `normalizedData` exists)
4. **Download as CSV** - Escaped CSV file with proper quoting
5. **Download as Markdown** - .md file download

**Implementation Details:**
```typescript
// Stability detection (lines 57-100)
- Memoize tableData with JSON.stringify comparison
- Set 1-second timeout when data changes
- Clear existing timers when new data arrives
- Only show menu when isDataStable && !isStreamActive

// CSV Generation (lines 341-371)
- Escape double quotes: replace " with ""
- Quote cells containing commas
- Join headers and rows with newlines
- Create blob and download link

// Markdown Download (lines 373-405)
- Generate filename from first header
- Sanitize filename (replace non-alphanumeric with _)
- Include toast with "Download Again" action button
```

**Icons Used:**
- `Download` - Main button
- `ChevronDown` - Dropdown indicator
- `FileText` - Copy as Text
- `FileDown` - Markdown operations
- `FileJson` - JSON export
- `FileSpreadsheet` - CSV export

---

### 2. EDITING FEATURES

#### A. Edit Mode System (lines 205-461)
**States:** `"none" | "header" | number` (rowIndex)

**Edit Flow:**
1. Click "Edit" button → enters "header" edit mode
2. Click header row → stays in header mode
3. Click data row → switches to that row's edit mode
4. Edit fields → changes stored in `internalTableData`
5. Click "Save" → calls `onSave()` callback, updates parent
6. Click "Cancel" → reverts to original data

**Visual Indicators:**
- **Edit Border:** Red dashed border when editing (line 464)
- **Row Highlight:** Blue background on active row (line 546)
- **Field Borders:** Blue dashed borders on input/textarea (lines 530, 556)

**Input Types:**
- **Headers:** `<input type="text">` (lines 524-535)
- **Cells:** `<textarea>` with `resize-y min-h-[8rem]` (lines 552-562)

**Features:**
- Auto-select on focus (`onFocus={(e) => e.target.select()}`)
- Stop propagation to prevent row click
- Maintains markdown formatting in display mode

#### B. Edit Buttons (lines 598-629)
**During Edit:**
- **Save Button:** Green dashed border, calls `handleSave()`
- **Cancel Button:** Red dashed border, calls `handleCancel()`

**Normal Mode:**
- **Edit Button:** Activates edit mode

**Callbacks:**
- `onSave(internalTableData)` - Save changes callback
- `onContentChange(updatedMarkdown)` - Markdown sync callback

---

### 3. DATA VIEWING FEATURES

#### A. View Toggle (lines 504-516, 577-586)
**Button Text:** "Data" (table view) | "Table" (JSON view)
**Condition:** Only shown if `normalizedData` exists

**JSON View:**
- Pre-formatted JSON with 2-space indentation
- Gray background container
- Scrollable
- Positioned button overlay

#### B. Normalized Data Generation (lines 181-201, 321-326)
**Structure:**
```typescript
{
  headers: string[],
  rows: string[][],
  normalizedData: Array<{ [key: string]: string }>
}
```

**Purpose:**
- Powers JSON export
- Enables database save
- Used for data manipulation

---

### 4. DATABASE INTEGRATION

#### A. Save to Database (lines 473-500, 632-639)
**Flow:**
1. Click "Save" button → opens `SaveTableModal`
2. User enters table name & description
3. Redux task created: `convert_normalized_data_to_user_data`
4. Backend processes and saves to database
5. Returns `SavedTableInfo` with `table_id`
6. Button changes to "View Saved Table"

**SaveTableModal Features (SaveTableModal.tsx):**
- Form with name & description (required)
- Multi-step loader with dynamic messages based on row count
- Redux integration for task management
- Safety timeout (20 seconds) for large tables
- Shows result with UserTableViewer
- "Open in New Tab" button (`/data/{table_id}`)

**State Management:**
```typescript
interface SavedTableInfo {
  table_id: string;
  table_name: string;
  row_count: string;
  field_count: string;
}
```

#### B. View Saved Table (lines 476-486, 640-646)
**Condition:** Only shown after table has been saved  
**Action:** Opens `ViewTableModal` with saved table info

**ViewTableModal Features (ViewTableModal.tsx):**
- Full-screen modal (95vw × 95vh)
- Embedded `UserTableViewer` component
- "Open in New Tab" button
- Shows row/field counts

---

### 5. MARKDOWN RENDERING

#### A. Rich Text Support (lines 240-287)
**Supported Formats:**
- `**bold**` → `<strong>bold</strong>`
- `*italic*` or `_italic_` → `<em>italic</em>`
- `[text](url)` → `<a href="url" target="_blank" rel="noopener noreferrer">text</a>`

**Implementation:**
- Regex-based replacement
- Link preservation during processing
- Handles nested formatting
- Links styled with blue color and underline
- Opens links in new tab

**Applied To:**
- Headers (line 536)
- Cell content (line 564)

---

### 6. THEME SYSTEM

#### A. Theme Architecture
**Default Theme:** `"professional"`  
**Total Themes:** 16 themes available

**Theme Categories:**
1. **Neutral:** default, professional, neutral, slate, blue
2. **Corporate:** corporate, corporateSubtle
3. **Colorful:** pinkBlue, oceanBreeze, forestMist, sunsetGlow, royalPurple
4. **Earth Tones:** mintChocolate, warmEarth
5. **Vibrant:** vibrantFun

**Theme Properties Used:**
```typescript
tableTheme = {
  header: string,      // Header background & hover
  headerText: string,  // Header text color
  row: {
    even: string,      // Even row bg
    odd: string,       // Odd row bg
    hover: string,     // Row hover state
  },
  border: string,      // Border colors
  text: string,        // Body text color
}
```

**Application:**
- Line 208: Theme loading from THEMES object
- Line 465: Border styling
- Line 520: Header classes
- Line 546: Row classes

---

### 7. TOAST NOTIFICATIONS

#### A. Toast System (useToastManager)
**Toast Types:**
- `success` - Green checkmark
- `error` - Red X
- `info` - Blue info icon

**Toast Implementations:**
1. **Copy Success:** "Table copied to clipboard"
2. **Copy Failure:** Error message
3. **Download Success:** Includes "Download Again" action button
4. **Edit Activated:** "Edit mode activated"
5. **Edit Deactivated:** "Edit mode deactivated"
6. **Save Success:** "Table data saved"
7. **Cancel Info:** "Edits cancelled"
8. **Database Save:** "Table {name} created successfully"

**Action Buttons:**
```typescript
toast.success("Message", {
  action: {
    label: "Download Again",
    onClick: () => { /* action */ },
    className: "font-medium",
  },
});
```

---

### 8. STATE MANAGEMENT

#### A. Internal State Tracking
```typescript
// Core data state
const [internalTableData, setInternalTableData] = useState(tableData);

// Edit mode tracking
const [editMode, setEditMode] = useState<"none" | "header" | number>("none");

// View mode
const [showNormalized, setShowNormalized] = useState(false);

// Modal states
const [showSaveModal, setShowSaveModal] = useState(false);
const [showViewModal, setShowViewModal] = useState(false);

// Database tracking
const [savedTableInfo, setSavedTableInfo] = useState<SavedTableInfo | null>(null);
```

#### B. Data Stability Detection (lines 214-237)
**Purpose:** Prevent state updates during user edits
**Method:** 
- Create hash of incoming data (JSON.stringify)
- Compare with previous hash
- Only update if changed

#### C. Prop Synchronization (lines 214-216)
**Pattern:** Update internal state when prop changes
**Prevents:** Losing user edits when parent re-renders

---

### 9. UTILITY FUNCTIONS

#### A. Markdown Table Generator (lines 289-300)
**Purpose:** Convert table data back to markdown format
**Features:**
- Calculates max column widths
- Pads cells for alignment
- Generates separator row
- Used for exports and content change callbacks

**Example Output:**
```markdown
| Name   | Age | City       |
|--------|-----|------------|
| Alice  | 25  | New York   |
| Bob    | 30  | San Fran   |
```

#### B. Event Handlers
- `handleHeaderChange` - Update header text
- `handleCellChange` - Update cell text
- `handleRowClick` - Switch edit mode to row
- `handleHeaderClick` - Switch to header edit
- `handleSave` - Save changes & exit edit mode
- `handleCancel` - Revert changes & exit edit mode

---

### 10. PROPS INTERFACE

```typescript
interface MarkdownTableProps {
  data: {
    headers: string[];
    rows: string[][];
    normalizedData?: Array<{ [key: string]: string }>;
  };
  className?: string;
  fontSize?: number;            // Default: 14
  theme?: string;              // Default: "professional"
  onSave?: (tableData) => void;
  content?: string;            // For markdown export
  onContentChange?: (markdown: string) => void;
  isStreamActive?: boolean;    // CRITICAL: Controls feature visibility
}
```

---

## 🚀 MIGRATION STRATEGY

### Phase 1: Core Features (Essential)
1. ✅ Basic table rendering (DONE)
2. ✅ Streaming support (DONE)
3. Add markdown rendering in cells
4. Generate normalizedData
5. Add theme support

### Phase 2: Export Features
6. Implement export dropdown menu
7. Add all copy functions
8. Add download functions
9. Add stability timer

### Phase 3: Editing Features
10. Add edit mode system
11. Implement header editing
12. Implement cell editing
13. Add save/cancel buttons
14. Add visual indicators

### Phase 4: Advanced Features
15. Add view toggle (JSON/Table)
16. Integrate SaveTableModal
17. Integrate ViewTableModal
18. Add database save button
19. Add toast notifications

### Phase 5: Polish
20. Add all themes
21. Test streaming behavior
22. Test all exports
23. Test editing
24. Test database integration
25. Performance optimization

---

## 📝 NOTES

1. **No Feature Loss:** Every single feature must be migrated
2. **Streaming-Aware:** All actions hidden during streaming
3. **Clean Architecture:** No duplicate parsing, direct block usage
4. **User Experience:** Maintain exact same UX as current table
5. **Performance:** Single-pass parsing, efficient re-renders
6. **Testing:** Extensive testing required for each feature

---

## ✅ ACCEPTANCE CRITERIA

- [ ] All 54 tasks in TODO list completed
- [ ] Every feature from old table works identically
- [ ] Streaming behavior perfect (no flickering/jumping)
- [ ] Edit mode works flawlessly
- [ ] All exports generate correct formats
- [ ] Database integration works
- [ ] All themes apply correctly
- [ ] Toast notifications show appropriately
- [ ] No re-parsing (use block data directly)
- [ ] Performance better than old implementation

