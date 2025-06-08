# Markdown Section Classifier - Frontend Rendering Guide

## Overview

The `extract_section_text()` method returns a single dictionary with all processing results. This guide shows you how to access and render each type of data.

## Quick Reference - All Known Types

### Line Types (in classified_sections)

**Block Types** (standalone content):

-   `json_block` - JSON code blocks
-   `table_block` - Markdown tables
-   `code_block` - Code blocks with language tags
-   `xml_block_*` - XML blocks (dynamic suffix, e.g., `xml_block_thinking`, `xml_block_function_calls`)

**Header Types**:

-   `header_h1`, `header_h1_underlined` - # Title or underlined with ===
-   `header_h2`, `header_h2_underlined` - ## Title or underlined with ---
-   `header_h3` - ### Title
-   `header_h4` - #### Title
-   `header_h5` - ##### Title
-   `header_h6` - ###### Title

**Text Types**:

-   `paragraph` - Regular text paragraphs
-   `bold_text` - **Bold text** sections
-   `entry_and_value` - Key: Value pairs

**List Types**:

-   `bullet` - Unordered list items (- or \*)
-   `sub_bullet` - Nested bullet points
-   `numbered_list_item` - Ordered list items (1., 2., etc.)
-   `check_item_checked` - Completed checklist items (- [x])
-   `check_item_unchecked` - Uncompleted checklist items (- [ ])

**Structure Types**:

-   `line_break` - Empty lines
-   `thematic_break` - Horizontal rules (---, \*\*\*, \_\_\_)
-   `reference` - Link references ([1]: url "title")

### Section Types (in processed*sections*\*)

**Block Sections** (standalone, no children):

-   `json_block_section`
-   `table_block_section`
-   `code_block_section`
-   `xml_block_section` (and variants like `xml_block_thinking_section`)

**Content Sections** (can have children):

-   `header_h1_section`, `header_h2_section`, `header_h3_section`, `header_h4_section`, `header_h5_section`, `header_h6_section`
-   `paragraph_section`
-   `bold_text_section`
-   `entry_and_value_section`

**List Sections**:

-   `checklist` - Groups of checkbox items
-   `numbered_list` - Groups of numbered items
-   `reference` - Groups of reference links

**Note**: Any unrecognized line type will become `{line_type}_section`

### Section Text Keys (in section*texts*\*)

**Base Keys** (may have `_2`, `_3`, etc. suffixes for duplicates):

-   `json_block_section`
-   `table_block_section`
-   `code_block_section`
-   `xml_block_section` (and variants)
-   `header_h1_section` through `header_h6_section`
-   `paragraph_section`
-   `bold_text_section`
-   `entry_and_value_section`
-   `checklist`
-   `numbered_list`
-   `reference`

**Dynamic Key Pattern**:

```javascript
// Base key: "header_h1_section"
// Duplicates: "header_h1_section_2", "header_h1_section_3", etc.

// Get all header sections
const headerKeys = Object.keys(section_texts).filter((key) => key.startsWith("header_h1_section"));
```

## Main Return Structure

```javascript
{
    // Original line-by-line classification
    classified_sections: [...],

    // Processed sections using different rule sets
    processed_sections_default: [...],
    processed_sections_by_header: [...],
    processed_sections_by_big_headers: [...],

    // Extracted text content from sections
    section_texts_default: {...},
    section_texts_by_header: {...},
    section_texts_by_big_headers: {...},

    // Any additional custom rule results
    additional_results: {
        custom_rule_name: {
            processed_sections: [...],
            section_texts: {...},
        },
    },
};
```

## Data Types & Structures

### 1. Classified Sections (classified_sections)

**Purpose**: Raw line-by-line classification
**Structure**: Array of classified items

```javascript
[
    {
        type: "header_h1",
        content: "# Main Title",
    },
    {
        type: "paragraph",
        content: "Some paragraph text here.",
    },
    {
        type: "json_block",
        content: '{\n  "key": "value"\n}',
        parsed_json: { key: "value" }, // Auto-parsed if valid JSON
    },
    {
        type: "table_block",
        content: "| Col1 | Col2 |\n|------|------|\n| A | B |",
        parsed_table: {
            markdown: { headers: ["Col1", "Col2"], rows: [["A", "B"]] },
            data: [{ Col1: "A", Col2: "B" }],
        },
    },
];
```

**Common Types**: `header_h1`, `header_h2`, `paragraph`, `json_block`, `table_block`, `code_block`, `bullet`, `numbered_list_item`, `line_break`, `thematic_break`

### 2. Processed Sections (processed*sections*\*)

**Purpose**: Grouped sections with parent-child relationships
**Structure**: Array of section objects

```javascript
[
  {
    "type": "header_h1_section",
    "children": [
      { "type": "header_h1", "content": "# Title" },
      { "type": "paragraph", "content": "Description text" },
      { "type": "bullet", "content": "- Item 1" }
    ]
  },
  {
    "type": "json_block_section",
    "children": [
      {
        "type": "json_block",
        "content": "...",
        "parsed_json": {...}
      }
    ]
  }
]
```

**Section Types Pattern**: `{original_type}_section`
**Examples**: `header_h1_section`, `paragraph_section`, `json_block_section`, `table_block_section`, `checklist`, `numbered_list`

### 3. Section Texts (section*texts*\*)

**Purpose**: Clean text content extracted from sections
**Structure**: Object with dynamic keys

```javascript
{
  "header_h1_section": "Title\nDescription text\n- Item 1",
  "header_h1_section_2": "Another title\nMore content",
  "json_block_section": "{\n  \"formatted\": \"json\"\n}",
  "table_block_section": "{\n  \"markdown\": {...},\n  \"data\": [...]\n}",
  "paragraph_section": "Just the paragraph text",
  "numbered_list": "1. First item\n2. Second item"
}
```

**Key Patterns**:

-   Base pattern: `{section_type}`
-   Duplicates: `{section_type}_2`, `{section_type}_3`, etc.
-   No strict list possible due to dynamic numbering

## Rendering Strategies

### For Classified Sections (Raw Content)

```javascript
// Iterate through each classified item
results.classified_sections.forEach((item) => {
    switch (item.type) {
        case "header_h1":
            renderH1(item.content);
            break;
        case "json_block":
            renderJSON(item.parsed_json || item.content);
            break;
        case "table_block":
            renderTable(item.parsed_table || item.content);
            break;
        default:
            renderText(item.content);
    }
});
```

### For Processed Sections (Structured Content)

```javascript
// Iterate through section groups
results.processed_sections_default.forEach((section) => {
    const sectionType = section.type;
    const children = section.children;

    renderSectionStart(sectionType);
    children.forEach((child) => {
        renderChild(child.type, child.content, child.parsed_json, child.parsed_table);
    });
    renderSectionEnd();
});
```

### For Section Texts (Clean Text)

```javascript
// Get all section text keys and render
Object.entries(results.section_texts_default).forEach(([sectionKey, textContent]) => {
    const baseSectionType = sectionKey.replace(/_\d+$/, ""); // Remove _2, _3, etc.
    renderTextSection(baseSectionType, textContent, sectionKey);
});
```

## Rule Set Differences

### Default Rules

-   Sections are more granular
-   Each content type gets its own section
-   Good for detailed content analysis

### By Header Rules

-   Similar to default but headers don't consume following content
-   Good for preserving document structure

### By Big Headers Rules

-   Headers consume all following content until next header of same/higher level
-   Good for document outline rendering
-   Creates hierarchical sections

## Special Data Handling

### JSON Blocks

-   Always check for `parsed_json` property first
-   Fallback to raw `content` if parsing failed
-   `parsed_json` is the actual JavaScript object

### Table Blocks

-   Always check for `parsed_table` property first
-   `parsed_table.data` = array of row objects for easy rendering
-   `parsed_table.markdown` = original table structure
-   Fallback to raw `content` if parsing failed

### Dynamic Keys

```javascript
// Get all section text keys matching a pattern
const headerSections = Object.keys(results.section_texts_default)
    .filter((key) => key.startsWith("header_h1_section"))
    .sort(); // Will give you: header_h1_section, header_h1_section_2, etc.
```

## Usage Examples

### Render Document Outline

```javascript
// Use by_big_headers for hierarchical structure
const sections = results.processed_sections_by_big_headers;
sections.forEach((section) => {
    if (section.type.includes("header_")) {
        renderDocumentSection(section);
    }
});
```

### Extract All JSON Data

```javascript
// Get all JSON blocks across all rule sets
const allJSON = [];
[results.processed_sections_default, results.processed_sections_by_header, results.processed_sections_by_big_headers].forEach(
    (sections) => {
        sections.forEach((section) => {
            section.children
                .filter((child) => child.type === "json_block" && child.parsed_json)
                .forEach((child) => allJSON.push(child.parsed_json));
        });
    }
);
```

### Render Clean Text Only

```javascript
// Use section_texts for clean content without markdown
Object.entries(results.section_texts_default).forEach(([key, text]) => {
    if (text.trim()) {
        // Skip empty sections
        renderCleanText(key, text);
    }
});
```

## Practical Utilities

### Working with Dynamic Keys

```javascript
// Utility functions for working with section text keys
const SectionUtils = {
    // Get base section type (removes _2, _3, etc.)
    getBaseSectionType: (key) => key.replace(/_\d+$/, ""),

    // Group keys by base type
    groupKeysByType: (sectionTexts) => {
        const groups = {};
        Object.keys(sectionTexts).forEach((key) => {
            const baseType = SectionUtils.getBaseSectionType(key);
            if (!groups[baseType]) groups[baseType] = [];
            groups[baseType].push(key);
        });
        return groups;
    },

    // Get all keys of a specific type
    getKeysOfType: (sectionTexts, baseType) => {
        return Object.keys(sectionTexts)
            .filter((key) => key.startsWith(baseType))
            .sort();
    },

    // Check if a key is a numbered duplicate
    isNumberedDuplicate: (key) => /_\d+$/.test(key),

    // Get the number from a numbered key (returns 1 for base keys)
    getKeyNumber: (key) => {
        const match = key.match(/_(\d+)$/);
        return match ? parseInt(match[1]) : 1;
    },
};

// Examples of usage:
const results = contentSectioner.extract_section_text(markdown);
const sectionTexts = results.section_texts_default;

// Group all sections by type
const grouped = SectionUtils.groupKeysByType(sectionTexts);
// Result: {
//   "header_h1_section": ["header_h1_section", "header_h1_section_2"],
//   "paragraph_section": ["paragraph_section"],
//   "json_block_section": ["json_block_section", "json_block_section_2", "json_block_section_3"]
// }

// Get all JSON sections in order
const jsonKeys = SectionUtils.getKeysOfType(sectionTexts, "json_block_section");
jsonKeys.forEach((key) => {
    console.log(`JSON Section ${SectionUtils.getKeyNumber(key)}:`, sectionTexts[key]);
});
```

### Type Checking Utilities

```javascript
const TypeCheckers = {
    // Check line types
    isHeaderType: (type) => type.startsWith("header_h"),
    isBlockType: (type) => ["json_block", "table_block", "code_block"].includes(type) || type.startsWith("xml_block"),
    isListType: (type) => ["bullet", "sub_bullet", "numbered_list_item", "check_item_checked", "check_item_unchecked"].includes(type),

    // Check section types
    isHeaderSection: (type) => type.startsWith("header_h") && type.endsWith("_section"),
    isBlockSection: (type) =>
        ["json_block_section", "table_block_section", "code_block_section"].includes(type) ||
        (type.startsWith("xml_block") && type.endsWith("_section")),
    isListSection: (type) => ["checklist", "numbered_list"].includes(type),

    // Check for special content
    hasParseableContent: (item) => {
        return item.parsed_json !== undefined || item.parsed_table !== undefined;
    },

    // Get the header level (1-6) from header types
    getHeaderLevel: (type) => {
        const match = type.match(/header_h(\d)/);
        return match ? parseInt(match[1]) : null;
    },
};

// Examples:
results.classified_sections.forEach((item) => {
    if (TypeCheckers.isHeaderType(item.type)) {
        const level = TypeCheckers.getHeaderLevel(item.type);
        console.log(`Found H${level} header:`, item.content);
    }

    if (TypeCheckers.hasParseableContent(item)) {
        if (item.parsed_json) {
            console.log("Parsed JSON:", item.parsed_json);
        }
        if (item.parsed_table) {
            console.log("Parsed table data:", item.parsed_table.data);
        }
    }
});
```

### Common Rendering Patterns

```javascript
// Render document structure using headers
const renderDocumentStructure = (sections) => {
    sections.forEach((section) => {
        if (TypeCheckers.isHeaderSection(section.type)) {
            const headerChild = section.children.find((child) => TypeCheckers.isHeaderType(child.type));
            if (headerChild) {
                const level = TypeCheckers.getHeaderLevel(headerChild.type);
                renderHeader(level, headerChild.content);

                // Render other children
                section.children.filter((child) => !TypeCheckers.isHeaderType(child.type)).forEach((child) => renderContent(child));
            }
        }
    });
};

// Extract all structured data (JSON + Tables)
const extractStructuredData = (results) => {
    const data = { json: [], tables: [] };

    results.classified_sections.forEach((item) => {
        if (item.type === "json_block" && item.parsed_json) {
            data.json.push(item.parsed_json);
        }
        if (item.type === "table_block" && item.parsed_table) {
            data.tables.push(item.parsed_table.data);
        }
    });

    return data;
};

// Render section texts with proper grouping
const renderSectionTexts = (sectionTexts) => {
    const grouped = SectionUtils.groupKeysByType(sectionTexts);

    Object.entries(grouped).forEach(([baseType, keys]) => {
        if (keys.length === 1) {
            // Single section
            renderSingleSection(baseType, sectionTexts[keys[0]]);
        } else {
            // Multiple sections of same type
            renderSectionGroup(
                baseType,
                keys.map((key) => ({
                    number: SectionUtils.getKeyNumber(key),
                    content: sectionTexts[key],
                }))
            );
        }
    });
};
```
