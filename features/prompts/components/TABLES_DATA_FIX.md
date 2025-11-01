# Tables Resource Data Preview - Fix Applied

## Issues Identified

The table resource preview was not showing actual data due to two critical issues:

### Issue 1: Type Mismatch ❌
**TablesResourcePicker** was sending:
- `type: 'table_row'`
- `type: 'table_column'`  
- `type: 'table_cell'`

**ResourcePreviewSheet** was expecting:
- `type: 'single_row'`
- `type: 'single_column'`
- `type: 'single_cell'`

This mismatch caused the preview logic to never match and execute the correct data fetching code.

### Issue 2: Incorrect Query Method ❌
**ResourcePreviewSheet** was trying to use direct Supabase table queries:
```typescript
const { data, error } = await supabase
    .from(tableName)  // ❌ Can't query user tables directly
    .select('*')
    .limit(100);
```

User-generated tables **cannot be queried directly** like system tables. They require RPC functions that handle security and proper data access.

## Fixes Applied

### Fix 1: Standardized Type Names ✅

**Updated TablesResourcePicker.tsx:**
```typescript
interface TableReference {
    type: 'full_table' | 'single_row' | 'single_column' | 'single_cell';  // ✅ Standardized
    table_id: string;
    table_name: string;
    row_id?: string;
    column_name?: string;
    column_display_name?: string;
    description: string;
}
```

**Changed all selection handlers to use correct types:**
- `'table_row'` → `'single_row'`
- `'table_column'` → `'single_column'`
- `'table_cell'` → `'single_cell'`

### Fix 2: Use Correct RPC Functions ✅

**Updated ResourcePreviewSheet.tsx** to use proper RPC functions:

#### Full Table Fetch:
```typescript
const { data: result, error } = await supabase
    .rpc('get_user_table_data_paginated', {
        p_table_id: tableId,
        p_limit: 100,
        p_offset: 0,
        p_sort_field: null,
        p_sort_direction: 'asc',
        p_search_term: null
    });

// Transform: result.data is array of { id, data } objects
const transformedData = result.data.map((row: any) => ({
    id: row.id,
    ...row.data  // Flatten the nested data object
}));
```

#### Single Row Fetch:
```typescript
const { data: result, error } = await supabase
    .rpc('get_user_table_row', {
        p_table_id: tableId,
        p_row_id: resource.data.row_id
    });

const transformedData = [{
    id: result.row.id,
    ...result.row.data  // Flatten the data
}];
```

#### Single Column Fetch:
```typescript
// Fetch all rows, then extract specific column
const { data: result, error } = await supabase
    .rpc('get_user_table_data_paginated', {
        p_table_id: tableId,
        p_limit: 100,
        p_offset: 0,
        p_sort_field: null,
        p_sort_direction: 'asc',
        p_search_term: null
    });

// Extract just the requested column
const columnName = resource.data.column_name;
const transformedData = result.data.map((row: any) => ({
    id: row.id,
    [columnName]: row.data[columnName]
}));
```

#### Single Cell Fetch:
```typescript
// Fetch specific row, then extract specific cell
const { data: result, error } = await supabase
    .rpc('get_user_table_row', {
        p_table_id: tableId,
        p_row_id: resource.data.row_id
    });

const columnName = resource.data.column_name;
const transformedData = [{
    id: result.row.id,
    [columnName]: result.row.data[columnName]
}];
```

## Key Differences: RPC vs Direct Query

### User-Generated Tables Structure
User tables store data in a nested JSON format:
```json
{
  "id": "row-uuid",
  "data": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

### Why RPC Functions are Required
1. **Security**: RPC functions enforce row-level security and user ownership
2. **Data Format**: They handle the nested `data` object structure
3. **Validation**: They validate table_id and ensure proper access
4. **Type Safety**: They return standardized response format with success/error

### Data Transformation
The RPC functions return data in this format:
```typescript
{
  success: boolean,
  data: Array<{ id: string, data: Record<string, any> }>,
  error?: string
}
```

We transform it to flat objects for the table display:
```typescript
const transformedData = result.data.map(row => ({
    id: row.id,
    ...row.data  // Spread the nested fields to top level
}));
```

## Result

The table preview now:
1. ✅ Correctly identifies the reference type
2. ✅ Uses proper RPC functions to fetch data
3. ✅ Transforms data to displayable format
4. ✅ Shows actual table content with proper columns and rows
5. ✅ Handles loading and error states
6. ✅ Displays up to 100 rows for preview
7. ✅ Works for all reference types (full table, row, column, cell)

## Testing

To verify the fix works:
1. Select a table resource
2. Choose any reference type (full table, row, column, or cell)
3. Click on the resource chip
4. Preview sheet should open showing actual data in a table format
5. Data should be properly formatted with column headers
6. Loading spinner should show while fetching
7. Errors should display clearly if they occur

## Files Modified

1. **TablesResourcePicker.tsx**
   - Fixed interface type definitions
   - Updated all selection handlers to use correct type names

2. **ResourcePreviewSheet.tsx**
   - Replaced direct Supabase queries with RPC function calls
   - Added data transformation logic
   - Improved error handling
   - Added proper success validation

Both components now work together seamlessly to display actual user table data!

