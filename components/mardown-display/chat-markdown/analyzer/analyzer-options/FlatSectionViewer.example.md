# FlatSectionViewer Component

A specialized viewer component designed for flat section structures with consistent numbering and raw/rendered content toggle.

## Purpose

Perfect for handling flat key-value objects where:
- Keys follow section naming patterns (`header_h2_section`, `paragraph_section_2`, etc.)
- Values are text content (string)
- You need consistent numbering (treating unnumbered as "1")
- Admins need to see both raw and rendered content

## Key Features

### ✅ **Consistent Numbering**
- Unnumbered sections automatically treated as "(1)"
- Numbered sections display their actual number: `(2)`, `(3)`, etc.
- **Before**: `Header H2 Section` vs `Header H2 Section (2)`
- **After**: `Header H2 Section (1)` vs `Header H2 Section (2)`

### ✅ **Smart Content Truncation** 
- Sidebar summaries stop at first `\n` (Python line break)
- Keeps sidebar clean and readable
- Full content displayed in main area

### ✅ **Raw/Rendered Toggle**
- **Rendered Mode**: Full markdown processing with line break enhancement
- **Raw Mode**: Plain text display preserving exact formatting
- Perfect for admin debugging and content verification

### ✅ **Bookmark Integration**
- Full path tracking: `data[0]["result"]["section_texts_by_header"]["header_h2_section_2"]`
- One-click copy functionality
- Seamless integration with bookmark navigation tool

## Usage

```typescript
import FlatSectionViewer from './FlatSectionViewer';

// Example data structure
const sectionData = {
  "header_h1_section": "# Main Title\n\nSome content here...",
  "header_h2_section_2": "## Subtitle\n\nMore content...",
  "paragraph_section": "Regular paragraph content\nWith line breaks...",
  "header_h3_section_2": "### Another Section"
};

<FlatSectionViewer 
  data={sectionData}
  bookmark='data[0]["result"]["section_texts_by_header"]'
/>
```

## When to Use

**Perfect for**:
- `section_texts_by_header` data from Python classifier
- Flat objects with section-like keys and string content
- When you need consistent numbering across variants
- Admin interfaces requiring raw content inspection

**Use IntelligentViewer instead for**:
- Complex nested structures
- Arrays of objects with children
- Unknown/experimental data formats

## Visual Indicators

- **Blue Toggle**: Rendered mode (markdown applied)
- **Orange Toggle**: Raw mode (no formatting)
- **Monospace Path**: Bookmark navigation path
- **Clean Sidebar**: Content truncated at first line break

Perfect for your frequent flat section use case! 🎯 