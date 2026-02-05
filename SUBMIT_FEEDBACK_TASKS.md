# User Feedback Tasks

> **Workflow:** Check items to approve → I fix them → You verify → Check "Tested" → I update DB and remove item

---

## Pending Feedback Items

### 1. Notes App Bottom Padding
| Field | Value |
|-------|-------|
| **ID** | `8ca13bc1-aac5-45b7-971b-b5c9427c4741` |
| **Type** | Feature |
| **Route** | `/notes` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-04 |

**Description:**
> The notes app needs to have padding at the bottom of individual notes to allow us to scroll past it so the last sentence is not stuck to the bottom of the page

**Research Context:**
- **Files to modify:**
  - `features/notes/components/mobile/MobileNoteEditor.tsx` (lines 233, 272) - Add `pb-safe` to scrollable content and sticky save button
  - `features/notes/components/NoteEditor.tsx` (line 600) - Add `pb-safe` to preview mode content wrapper
- **Fix:** Add `pb-safe` class for iOS safe area support and additional bottom padding

- [ ] **Approve** | - [ ] **Tested**

---

### 2. Centralize Contacts List for Sharing
| Field | Value |
|-------|-------|
| **ID** | `dae0f40e-3d9b-45cb-875e-87b9dce818f0` |
| **Type** | Feature |
| **Route** | `/ai/prompts` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |

**Description:**
> When sharing a prompt, even though the system has a list of my 'contacts' it's not showing them to me so we need to take the email system's list creation logic and centralize it so we have it everywhere

**Research Context:**
- **Email system location:** `/app/(authenticated)/admin/email/page.tsx` - Has user selection UI
- **Prompt sharing:** `/features/sharing/components/tabs/ShareWithUserTab.tsx` - Uses `lookup_user_by_email` RPC
- **RPC functions used:** `lookup_user_by_email`, `get_user_emails_by_ids`
- **Fix:** Create centralized user lookup service/utility that wraps these RPC calls. Add a contact selection component reusable across email, sharing, messaging.

- [ ] **Approve** | - [ ] **Tested**

---

### 3. RLS Error When Sharing Prompt with Organization
| Field | Value |
|-------|-------|
| **ID** | `ac389b5c-d768-495b-a55a-2a76d675711e` |
| **Type** | Feature |
| **Route** | `/ai/prompts` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Screenshot** | Yes (1 image) |

**Description:**
> When trying to share a prompt with an organization, we get a "row level security policy error" for table: "Permissions"

**Research Context:**
- **Core file:** `utils/permissions/service.ts` - `shareWithOrg()` function (lines 140-204)
- **Issue:** Direct insert to `permissions` table (lines 169-179) without organization membership verification
- **Root cause:** RLS policy likely requires:
  1. User is member of the organization, OR
  2. User owns the resource being shared
- **Fix options:**
  1. Add membership verification before insert
  2. Create `share_resource_with_organization()` SECURITY DEFINER RPC function (similar to user sharing)
  3. Review/update RLS policies on `permissions` table

- [ ] **Approve** | - [ ] **Tested**

---

### 4. Add Screenshot Capture to Bug Reporter
| Field | Value |
|-------|-------|
| **ID** | `ff39b841-293f-4b2a-ac21-390c906554d0` |
| **Type** | Feature |
| **Route** | `/ai/prompts` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |

**Description:**
> This bug tool needs to allow pasting a screenshot or even add a feature to take an automated screenshot since we've already built that.

**Research Context:**
- **Bug reporter:** `components/layout/FeedbackButton.tsx` - Currently uses manual file upload only
- **Existing screenshot hook:** `hooks/useScreenshot.ts` - Production-ready, uses `html2canvas`
  - Returns `fullSize`, `compressed`, `thumbnail` formats
  - Includes metadata (timestamp, viewport, pathname)
- **Fix:** 
  1. Import `useScreenshot` hook into `FeedbackButton`
  2. Add "Capture Screenshot" button that calls `captureScreen()`
  3. Add paste handler for clipboard images (`Ctrl+V`)
  4. Convert base64 to blob and upload to Supabase storage

- [ ] **Approve** | - [ ] **Tested**

---

### 5. Show Prompt Info in Prompt-App View
| Field | Value |
|-------|-------|
| **ID** | `f46cb12a-7782-48ff-a394-b30584372def` |
| **Type** | Feature |
| **Route** | `/prompt-apps/a093eb0a-742d-4b77-96b7-029ab76b7011` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |

**Description:**
> When inside of a prompt-app, since we know what prompt drives it, it would be nice to clearly see that and also offer a link that takes you to prompt builder for that prompt

**Research Context:**
- **Page:** `app/(authenticated)/prompt-apps/[id]/page.tsx` - Server component
- **Editor:** `features/prompt-apps/components/PromptAppEditor.tsx` - Client component
- **Type:** `PromptApp` has `prompt_id: string` field
- **Prompt builder routes:** `/ai/prompts/edit-redux/[id]` (new) or `/ai/prompts/edit/[id]` (legacy)
- **Fix:** 
  1. Fetch prompt name in server component or client-side using `prompt_id`
  2. Add prompt info section in "Basic Information" tab (around line 403)
  3. Include link to prompt builder: `/ai/prompts/edit-redux/${app.prompt_id}`

- [ ] **Approve** | - [ ] **Tested**

---

### 6. Data Download Missing Records & Wrong Sort
| Field | Value |
|-------|-------|
| **ID** | `6b249e3c-617c-4dd3-ab63-6284e41aaa04` |
| **Type** | Bug |
| **Route** | `/data/f692c065-6f50-488a-8ffd-e5f89ee651b6` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |

**Description:**
> The data download/copy isn't getting everything. Maybe a pagination problem. Also, it's not getting the same sort as the one you actively have.

**Research Context:**
- **Export modal:** `components/user-generated-table-data/ExportTableModal.tsx`
- **Table viewer:** `components/user-generated-table-data/UserTableViewer.tsx` - Has `sortField`, `sortDirection`, pagination state
- **Toolbar:** `components/user-generated-table-data/TableToolbar.tsx` - Only passes `tableId`, `tableName` to export modal
- **Root cause:**
  1. Export modal doesn't receive sort/pagination state
  2. DB functions `export_user_table_as_csv` and `get_user_table_complete` ignore sort
  3. `get_user_table_data_paginated` supports sorting but isn't used for exports
- **Fix:**
  1. Pass sort state from `UserTableViewer` → `TableToolbar` → `ExportTableModal`
  2. Use `get_user_table_data_paginated` with large limit + current sort for export
  3. Convert fetched data to CSV/JSON/Markdown client-side

- [ ] **Approve** | - [ ] **Tested**

---

### 7. Admin Feedback Images RLS Issue
| Field | Value |
|-------|-------|
| **ID** | `f300a3e0-153c-4329-b29a-797d60d6043c` |
| **Type** | Bug |
| **Route** | `/administration/feedback` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |

**Description:**
> In admin feedback, there is an RLS issue with seeing the attached images

**Research Context:**
- **Dialog:** `app/(authenticated)/(admin-auth)/administration/feedback/components/FeedbackDetailDialog.tsx`
- **Image display:** Lines 207-224 - Direct `src={url}` without authentication
- **Storage bucket:** `userContent` at path `feedback-images/`
- **Existing pattern:** `useSignedUrl` hook in `features/transcripts/hooks/useSignedUrl.ts`
- **Fix:**
  1. Detect Supabase storage URLs and convert to signed URLs
  2. Use existing `useSignedUrl` hook for each image
  3. OR create API route to proxy images with authentication

- [ ] **Approve** | - [ ] **Tested**

---

### 8. User Feedback Status View
| Field | Value |
|-------|-------|
| **ID** | `3637e739-c400-4e37-b3fa-0c84a02e73b1` |
| **Type** | Feature |
| **Route** | `/data/f692c065-6f50-488a-8ffd-e5f89ee651b6` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |

**Description:**
> Add a feature to the bug reporting system where the user can see the things they've reported and the status of each.

**Research Context:**
- **Backend exists:** `actions/feedback.actions.ts` - `getUserFeedback()` function already fetches user's own feedback
- **No UI exists:** Need to create user-facing feedback view
- **Fix:**
  1. Create `/features/feedback/components/UserFeedbackList.tsx`
  2. Add route `/account/feedback` or add tab to existing account/settings page
  3. Display list with: type, description, status, date, images
  4. Use existing `getUserFeedback()` server action

- [ ] **Approve** | - [ ] **Tested**

---

### 9. Download/Copy Current Search & Single Row
| Field | Value |
|-------|-------|
| **ID** | `0b192ef8-8d22-4b2f-914e-91659e4bab3a` |
| **Type** | Feature |
| **Route** | `/data/f692c065-6f50-488a-8ffd-e5f89ee651b6` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |

**Description:**
> Add a feature to download or copy the current search you have as opposed to only the entire table. Also, add a feature to the view/edit of a row where you can copy/download the row.

**Research Context:**
- **Related to #6** - Same files need modification
- **Export modal:** `components/user-generated-table-data/ExportTableModal.tsx`
- **Table viewer:** `components/user-generated-table-data/UserTableViewer.tsx`
- **Fix:**
  1. Pass current search/filter state to export modal
  2. Add "Export Current View" option that respects filters
  3. Add "Copy Row" / "Download Row" buttons to row detail/edit dialog
  4. Format single row as JSON/CSV for copy/download

- [ ] **Approve** | - [ ] **Tested**

---

### 10. Table Last Column Cut Off in Prompt Output
| Field | Value |
|-------|-------|
| **ID** | `fee2af21-d1e5-4cc0-8181-583c2f277a91` |
| **Type** | Bug |
| **Route** | `/ai/prompts/run/f89aa9d0-49f4-4816-86be-6c18aa09c5d4` |
| **User** | seo@titaniumsuccess.com |
| **Date** | 2026-02-02 |
| **Screenshot** | Yes (1 image) |

**Description:**
> When PROMPT is generating TABLE then last column is not full visible and hiding data

**Research Context:**
- **File:** `components/mardown-display/blocks/table/StreamingTableRenderer.tsx`
- **Line 591:** Uses `overflow-hidden` which clips content
- **Fix:** Change `overflow-hidden` to `overflow-x-auto` to allow horizontal scrolling for wide tables

```tsx
// Before (line 591)
<div className={cn("overflow-hidden border border-border rounded-lg shadow-sm", ...)}>

// After
<div className={cn("overflow-x-auto border border-border rounded-lg shadow-sm", ...)}>
```

- [ ] **Approve** | - [ ] **Tested**

---

### 11. Organization Email Sending
| Field | Value |
|-------|-------|
| **ID** | `1a523a09-ece1-4f97-b821-22a16c219f75` |
| **Type** | Bug |
| **Route** | `/organizations/f9cb3e35-2a65-4f2a-8525-088d6551071c/settings` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-01-30 |
| **Screenshot** | Yes (1 image) |

**Description:**
> Set it up so that you can send emails here: https://www.aimatrx.com/organizations/f9cb3e35-2a65-4f2a-8525-088d6551071c/settings
> With the new email system in place, this should be doable.

**Research Context:**
- **Org settings:** `features/organizations/components/OrgSettings.tsx` - Has tabs: General, Members, Invitations, Danger Zone
- **Email infrastructure exists:**
  - `lib/email/client.ts` - Resend client
  - `app/api/email/send/route.ts` - Generic email sending
  - `components/admin/EmailComposeSheet.tsx` - Email compose UI
- **Fix:**
  1. Add "Email" tab to `OrgSettings.tsx`
  2. Create `EmailSettings.tsx` component with:
     - Email compose/send functionality (reuse `EmailComposeSheet`)
     - Member email list from organization members
  3. Connect to existing email API route

- [ ] **Approve** | - [ ] **Tested**

---

## Summary by Priority

### Quick Fixes (< 30 min each)
- [ ] **#1** Notes padding - Simple CSS change
- [ ] **#10** Table overflow - Single line CSS fix

### Medium Complexity (1-2 hours each)
- [ ] **#4** Screenshot capture - Hook integration
- [ ] **#5** Prompt-app info - Fetch + display
- [ ] **#7** Admin images RLS - Signed URL integration
- [ ] **#8** User feedback view - New component + route

### Higher Complexity (2-4 hours each)
- [ ] **#6** & **#9** Data export fixes - Related, do together
- [ ] **#3** Org sharing RLS - May need DB function
- [ ] **#11** Org email - New settings tab + compose

### Requires More Planning
- [ ] **#2** Centralize contacts - Architecture decision needed

---

## Status Legend
- **new** - Not yet addressed
- **resolved** - Fix implemented
- **closed** - Verified working
- **wont_fix** - Declined
