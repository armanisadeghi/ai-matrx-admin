# File System & Utilities Cleanup Tasks

This document tracks cleanup and organizational improvements for the file system and utilities across the application.

## File Operations Organization

### High Priority

- [ ] **Refactor `constants.ts`** - This 679-line file contains configuration, types, and utility functions mixed together
  - [ ] Split configuration constants into `config.ts`
  - [ ] Move utility functions to `utils.ts` or dedicated utility files
  - [ ] Keep only actual constants in `constants.ts`
  - [ ] Update all imports across the codebase

- [ ] **Type Definitions Consolidation**
  - [ ] Review `types.ts` vs inline types in `constants.ts`
  - [ ] Ensure consistent type exports
  - [ ] Remove duplicate type definitions

### Medium Priority

- [ ] **Icon System Standardization**
  - [ ] Document the comprehensive icon mapping system
  - [ ] Ensure all file types in `FILE_EXTENSIONS_LOOKUP` have proper icons
  - [ ] Add missing file types (if any) discovered during usage
  - [ ] Create visual guide/documentation for icon system

- [ ] **Bucket Configuration**
  - [ ] Review and document `BUCKET_DEFAULTS` structure
  - [ ] Ensure consistency with FileSystemProvider bucket handling
  - [ ] Add type safety for bucket names

- [ ] **Function Organization**
  - [ ] `getFileDetailsByExtension` - comprehensive, keep in utils
  - [ ] `getFolderDetails` - comprehensive, keep in utils
  - [ ] `getFileDetailsByUrl` - review if this belongs in constants
  - [ ] `getBucketDetails` - move to dedicated bucket utilities

### Low Priority

- [ ] **Documentation**
  - [ ] Add JSDoc comments to all exported functions
  - [ ] Create usage examples for common patterns
  - [ ] Document the file type categorization system

- [ ] **Testing**
  - [ ] Add unit tests for file type detection
  - [ ] Add tests for icon resolution
  - [ ] Test edge cases (no extension, multiple dots, etc.)

## File System Components

### Completed ✅
- [x] Removed redundant FileSystemProvider wrapping in test layouts
- [x] Fixed hydration error in FileTreeSkeleton (Math.random issue)
- [x] Integrated existing icon system into NodeItem component
- [x] Added comprehensive context menu with file operations
- [x] Implemented folder loading feedback
- [x] Added smart name truncation with tooltips
- [x] Added "Copy Public Link" functionality with modal
- [x] Added "File Info" modal with metadata display
- [x] Fixed infinite loop in MultiBucketFileTree (actions object in useEffect dependency array)
- [x] Fixed multi-bucket Redux slice usage - added bucketName prop to NodeItem and FileContextMenu
  - Each bucket now uses its own Redux slice correctly
  - Context menu operations work on the correct bucket
  - Folder expansion works properly in all buckets

### In Progress
- [ ] Verify all menu operations work correctly across different file types
- [ ] Test multi-file selection operations
- [ ] Ensure drag-and-drop works with all file types

### Pending
- [ ] Create comprehensive documentation after full testing
- [ ] Add keyboard shortcuts documentation
- [ ] Performance optimization for large file trees

## Notes

- The existing `FILE_EXTENSIONS_LOOKUP` system is very comprehensive (~3000 lines of configuration)
- Always use existing utilities before creating new ones
- Maintain backward compatibility when refactoring
- Test thoroughly in multiple scenarios before marking tasks complete

---

**Last Updated:** [Current Date]
**Maintained By:** Development Team

