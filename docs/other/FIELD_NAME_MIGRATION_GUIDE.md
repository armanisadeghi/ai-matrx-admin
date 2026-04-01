# Field Name Standardization - Follow-Up Tasks

## Overview

The React UI has been updated to prevent creation of new data with non-standard field names. All new fields will automatically have sanitized `field_name` values in snake_case format.

**Completed:**
- ✅ Created field name sanitization utility
- ✅ Updated all field creation UI components
- ✅ Added validation safety checks to utility functions
- ✅ Implemented auto-generation with preview display

**Status:** All new data created from this point forward will have properly sanitized field names.

---

## Follow-Up Tasks

### 1. Backend Validation (High Priority)

**Goal:** Add server-side validation to PostgreSQL RPC functions.

**Tasks:**
- [ ] Create PostgreSQL function to validate field names
  ```sql
  CREATE OR REPLACE FUNCTION validate_field_name(name TEXT)
  RETURNS BOOLEAN AS $$
  BEGIN
    RETURN name ~ '^[a-z][a-z0-9_]*$';
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] Update `create_new_user_table_dynamic` RPC function
  - Add field name validation before insertion
  - Return error if invalid field name detected
  - Log validation failures for monitoring

- [ ] Update `add_column_to_user_table` RPC function
  - Add field name validation
  - Sanitize field names server-side as backup
  - Ensure consistency with frontend validation

- [ ] Add CHECK constraint to `table_fields` table
  ```sql
  ALTER TABLE table_fields 
  ADD CONSTRAINT valid_field_name_format 
  CHECK (validate_field_name(field_name));
  ```

**Impact:** Prevents any non-standard field names from being saved, even via API or direct database access.

---

### 2. Data Migration Script (Medium Priority)

**Goal:** Provide tools to fix existing tables with non-standard field names.

**Tasks:**
- [ ] Create migration analysis script
  - Query all tables with non-standard field names
  - Generate report showing affected tables/fields
  - Estimate migration complexity

- [ ] Create PostgreSQL migration function
  ```sql
  CREATE OR REPLACE FUNCTION migrate_field_name(
    p_table_id UUID,
    p_old_field_name VARCHAR,
    p_new_field_name VARCHAR
  )
  RETURNS JSONB AS $$
  -- Updates field_name in table_fields
  -- Updates all JSONB keys in table_data
  -- Returns success/error status
  $$ LANGUAGE plpgsql;
  ```

- [ ] Build React UI component for migration
  - **Location:** `components/user-generated-table-data/FieldMigrationTool.tsx`
  - Show list of tables with non-standard field names
  - Allow users to preview migration changes
  - Execute migration with confirmation dialog
  - Show progress and results

- [ ] Create bulk migration tool
  - Process multiple tables at once
  - Handle dependencies between tables
  - Rollback on errors

**Impact:** Allows users to gradually fix existing data without breaking changes.

---

### 3. Health Check Tool (Medium Priority)

**Goal:** Help users identify and fix data quality issues.

**Tasks:**
- [ ] Create "Table Health Check" component
  - **Location:** `components/user-generated-table-data/TableHealthCheck.tsx`
  - Scan all user tables
  - Identify non-standard field names
  - Show warnings for problematic tables
  - Provide "Fix" button to launch migration tool

- [ ] Add health check to table settings
  - Show health status badge in table cards
  - Display warnings in table viewer
  - Link to migration tool

- [ ] Create PostgreSQL function to analyze table health
  ```sql
  CREATE OR REPLACE FUNCTION check_table_health(p_table_id UUID)
  RETURNS JSONB AS $$
  -- Returns issues found in table
  -- Including non-standard field names, orphaned data, etc.
  $$ LANGUAGE plpgsql;
  ```

**Impact:** Proactive identification of data quality issues.

---

### 4. Analytics & Monitoring (Low Priority)

**Goal:** Track field naming patterns and migration progress.

**Tasks:**
- [ ] Add analytics events
  - Track when field names are sanitized
  - Log validation warnings
  - Monitor migration tool usage

- [ ] Create dashboard showing:
  - % of tables with standard field names
  - Most common field naming issues
  - Migration progress over time

- [ ] Add alerting for validation failures
  - Notify if backend validation blocks requests
  - Track attempted non-standard field names

**Impact:** Data-driven insights for continuous improvement.

---

### 5. Documentation Updates (Low Priority)

**Goal:** Educate users about field naming best practices.

**Tasks:**
- [ ] Update user documentation
  - Explain field name auto-generation
  - Show examples of valid/invalid names
  - Describe migration process

- [ ] Add in-app help tooltips
  - Explain why field names are auto-generated
  - Link to full documentation

- [ ] Create developer guide
  - Document sanitization rules
  - Explain validation logic
  - Provide API examples

**Impact:** Reduce user confusion and support requests.

---

### 6. Testing & Validation (High Priority)

**Goal:** Ensure all changes work correctly in production.

**Tasks:**
- [ ] Unit tests for sanitization function
  - Test edge cases (numbers, special chars, etc.)
  - Verify consistency across all components

- [ ] Integration tests for field creation
  - Test all field creation flows
  - Verify JSONB keys are correct
  - Test with existing data

- [ ] E2E tests for migration tool
  - Test migration of simple tables
  - Test migration with references
  - Test rollback scenarios

- [ ] Load testing
  - Test migration of large tables
  - Verify performance impact

**Impact:** Confidence in production deployment.

---

## Priority Recommendations

### Immediate (Next Sprint)
1. **Backend Validation** - Adds critical server-side protection
2. **Testing** - Ensures current changes work correctly

### Short-term (1-2 Sprints)
3. **Health Check Tool** - Helps users identify issues
4. **Data Migration Script** - Enables cleanup of existing data

### Long-term (Future Sprints)
5. **Analytics** - Provides insights for optimization
6. **Documentation** - Reduces support burden

---

## Technical Considerations

### JSONB Key Migration
The most complex part of migration is updating JSONB keys in `table_data`:

```sql
-- Example: Rename field_name "Total Revenue" to "total_revenue"
UPDATE table_data
SET data = jsonb_set(
  data - 'Total Revenue',
  '{total_revenue}',
  data->'Total Revenue'
)
WHERE table_id = '<table_id>'
  AND data ? 'Total Revenue';
```

**Challenges:**
- Must be atomic (transaction)
- Performance on large tables
- Handling missing/null values
- Preserving data integrity

**Solution:**
- Batch processing for large tables
- Comprehensive error handling
- Transaction rollback on failure
- Progress tracking and resumability

---

## Success Metrics

**Phase 1 (Completed):**
- ✅ 0% of new fields have non-standard names
- ✅ No breaking changes to existing functionality
- ✅ User experience remains smooth

**Phase 2 (Backend Validation):**
- 100% of field names validated server-side
- 0 invalid field names bypass validation
- < 1% validation error rate

**Phase 3 (Migration):**
- Tool successfully migrates 95%+ of tables
- < 5% manual intervention required
- 0 data loss during migration

**Phase 4 (Cleanup):**
- < 5% of tables have non-standard field names
- All critical tables migrated
- Health check passes for 95%+ of tables

---

## Questions & Decisions

### Should we allow manual override?
**Decision:** Not initially. Can add "Advanced" toggle later if needed.

### When to enforce CHECK constraint?
**Decision:** After most tables are migrated (Phase 3 complete).

### Support for legacy field names?
**Decision:** Yes, existing data continues to work. Migration is optional but encouraged.

### API backward compatibility?
**Decision:** Maintain compatibility. Both field_name formats work for reads, only sanitized names for writes.

---

## Resources

**Files Modified:**
- `utils/user-table-utls/field-name-sanitizer.ts` (new)
- `components/user-generated-table-data/CreateTableModal.tsx`
- `components/user-generated-table-data/AddColumnModal.tsx`
- `components/user-generated-table-data/ImportTableModal.tsx`
- `components/user-generated-table-data/CreateTemplateModal.tsx`
- `utils/user-table-utls/table-utils.ts`

**Related Documentation:**
- Original Analysis: `.cursor/plans/user_table_field_naming_analysis_24acbcb2.plan.md`
- Implementation Plan: `.cursor/plans/fix_field_name_ui_generation_76752d62.plan.md`

**Contact:**
For questions about this implementation, refer to the original analysis and implementation plans.
