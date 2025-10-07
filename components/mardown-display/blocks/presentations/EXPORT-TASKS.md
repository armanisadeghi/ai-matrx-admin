# Presentation Export Implementation Tasks

## Overview
Add export functionality to presentation slideshow component with multiple format options.

---

## ✅ Phase 1: Core Infrastructure (TODAY)

### 1. Export Utility File
- [x] Create `presentation-export.ts` with export functions
- [x] PDF export using `html2canvas` + `jspdf` (packages already installed)
- [x] HTML export integration (needs discussion - link to existing system)
- [x] PowerPoint export skeleton (needs `pptxgenjs` package)
- [x] Google Slides export skeleton (needs `googleapis` package)

### 2. Export UI Components
- [x] Add export dropdown menu to Slideshow header
- [x] Export button with download icon
- [x] Menu items for each export option
- [x] "Coming Soon" badges for incomplete options

### 3. Slideshow Component Updates
- [x] Add export menu to header (near fullscreen button)
- [x] Wire up PDF export (functional today)
- [x] Wire up HTML export (pending integration)
- [x] Wire up PowerPoint export (coming soon)
- [x] Wire up Google Slides export (coming soon)

---

## ✅ Phase 2: Complete Remaining Exports (COMPLETED)

### 4. PowerPoint Export ✅ READY
- [x] Install: `pnpm add pptxgenjs`
- [x] Implement slide layout generation
- [x] Map theme colors to PowerPoint
- [x] Handle intro vs content slide types
- [x] Format bullets and text properly
- [x] Support markdown bold syntax

### 5. HTML Export Integration ✅ READY
- [x] Convert presentation to markdown
- [x] Integrate with existing HTML Pages system
- [x] Opens HtmlPreviewFullScreenEditor for review/edit
- [x] Full WordPress CSS styling support
- [x] User can publish to database with SEO metadata

---

## 🚀 Phase 3: Advanced Features (DEFERRED)

### 6. Google Slides Export ⏸️ DISABLED (OAuth Setup Needed)
- [x] Use existing OAuth system
- [x] Add Slides API scope
- [x] Map presentation data to Slides API format
- [x] Handle authentication flow
- [x] Create presentations via REST API
- [x] Support markdown bold syntax
- [x] Apply theme colors
- [x] Auto-open created presentation
- [ ] **Currently disabled pending OAuth configuration**

### 7. Export Options & Customization
- [ ] Export quality settings (PDF resolution)
- [ ] Include/exclude animations toggle
- [ ] Custom filename dialog
- [ ] Batch export all formats

---

## 📁 File Structure
```
components/mardown-display/blocks/presentations/
├── Slideshow.tsx (main component)
├── example.tsx (sample data)
├── presentation-export.ts (NEW - export utilities)
├── PresentationExportMenu.tsx (NEW - UI component)
└── EXPORT-TASKS.md (this file)
```

---

## 🎯 Success Criteria
- ✅ Export menu visible in slideshow
- ✅ PDF export works immediately
- ✅ PowerPoint export functional
- ✅ HTML export integrated with existing system
- ✅ "Coming Soon" indicators for incomplete options
- ✅ Easy to extend with new export formats
- ✅ All files in same directory
- ✅ Google Slides temporarily disabled (needs OAuth setup)

---

## 🔧 Technical Notes

### PDF Export (Ready)
- Uses existing `html2canvas` + `jspdf`
- Captures each slide as rendered
- Landscape orientation (297x210mm)
- Client-side only, no backend needed

### HTML Export (✅ Ready)
- Converts presentation to markdown
- Opens in existing HtmlPreviewFullScreenEditor
- User can review/edit before publishing
- Leverages HTML Pages system with WordPress CSS
- Full SEO metadata support

### PowerPoint Export (✅ Ready)
- Client-side generation with `pptxgenjs`
- Editable format, universal compatibility
- ~100KB package size
- Map theme colors and layouts
- Supports markdown bold syntax

### Google Slides Export (⏸️ Disabled)
- Implementation complete but disabled
- Requires OAuth configuration
- REST API integration functional
- Will be re-enabled once OAuth is configured

