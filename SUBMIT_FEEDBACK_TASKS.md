# User Feedback Tasks

> **Source of truth:** Supabase `user_feedback` table (queried via MCP)
> **Last synced:** 2026-02-07
> **Summary:** 18 total | 14 new | 1 in_progress | 1 resolved | 1 closed | 2 wont_fix

## Workflow

1. Review items below and check **Approve** for items you want fixed
2. I fix approved items (auto-fix for score 4-5, ask first for lower)
3. You test and check **Tested**
4. I update DB status and remove from this list

---

## NEW Items (14)

### 1. Prompt Builder Editor Auto-Scrolling Bug
| Field | Value |
|-------|-------|
| **ID** | `0cbf8e6f-3416-48bf-8fc5-6c1c66007812` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/ai/prompts/edit/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-07 |
| **Autonomy Score** | 3/5 (Arman +1, clearly a bug +1, not opinion +1, but complex fix with risk 0, not simple 0) |

**Description:** When typing in the system prompt editor (which is typically 3-6 pages of text), the UI auto-scrolls to the top of the system prompt instead of staying where the user is typing. Every few characters cause 3-4 pages of unwanted scrolling. Related to save behavior, refreshes, or scroll restoration.

**Research:** Start at `app/(authenticated)/ai/prompts/edit/[id]/page.tsx`. The scrolling container holds model selection, settings, variables, system prompt, and messages. The issue is likely `scrollIntoView` or focus restoration triggered during auto-save.

- [ ] **Approve** | - [ ] **Tested**

---

### 2. Token Management - Session Expired Prematurely
| Field | Value |
|-------|-------|
| **ID** | `fd392160-85f0-42f0-879c-d93dfd678737` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/ai/prompts/edit/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-07 |
| **Autonomy Score** | 2/5 (Arman +1, clearly a bug +1, but auth is high-risk 0, not simple 0, needs design discussion 0) |

**Description:** Sessions are expiring before the weekly Supabase limit. Error: `Invalid Refresh Token: Session Expired (Revoked by Newer Login)`. The token management system should silently refresh for valid users instead of logging them out.

**Research:** Check Supabase auth config, token refresh logic, and whether multiple tabs/devices are revoking each other's sessions. This is an auth infrastructure issue requiring careful investigation.

- [ ] **Approve** | - [ ] **Tested**

---

### 3. Bug Reporter - Allow Multiple Image Attachments
| Field | Value |
|-------|-------|
| **ID** | `12ddfc4e-2187-4467-a76f-967b798a3dea` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/ai/prompts/edit/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-07 |
| **Autonomy Score** | 4/5 (Arman +1, bug +1, not opinion +1, low risk +1, moderately simple 0) |

**Description:** The feedback/bug submission system should allow attaching/pasting more than one image without making the UI more complex. Currently limited to a single image.

**Research:** `components/layout/FeedbackButton.tsx` -- uses `FileUploadWithStorage`. The `image_urls` column is already an array. Need to allow multiple uploads in sequence with a minimal UI addition (e.g., small "+" button after first image).

- [ ] **Approve** | - [ ] **Tested**

---

### 4. Notes App Bottom Padding
| Field | Value |
|-------|-------|
| **ID** | `8ca13bc1-aac5-45b7-971b-b5c9427c4741` |
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/notes` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-04 |
| **Autonomy Score** | 5/5 (Arman +1, clear UX issue +1, not opinion +1, zero risk +1, simple CSS +1) |

**Description:** Notes app needs padding at the bottom of individual notes so the last sentence isn't stuck to the bottom of the page.

**Research:**
- `features/notes/components/mobile/MobileNoteEditor.tsx` (lines 233, 272) - Add `pb-safe` / extra padding
- `features/notes/components/NoteEditor.tsx` (line 600) - Add bottom padding to preview mode

- [ ] **Approve** | - [ ] **Tested**

---

### 5. Centralize Contacts List for Sharing
| Field | Value |
|-------|-------|
| **ID** | `dae0f40e-3d9b-45cb-875e-87b9dce818f0` |
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/ai/prompts` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Autonomy Score** | 2/5 (Arman +1, not opinion +1, but architecture decision 0, moderate risk 0, not simple 0) |

**Description:** When sharing a prompt, the contact list from the email system isn't available. Need to centralize user lookup logic so contacts are available everywhere (sharing, email, messaging).

**Research:** Email system at `/app/(authenticated)/admin/email/page.tsx`. Sharing at `/features/sharing/components/tabs/ShareWithUserTab.tsx`. Both use `lookup_user_by_email` and `get_user_emails_by_ids` RPCs independently. Need a shared service/hook.

- [ ] **Approve** | - [ ] **Tested**

---

### 6. RLS Error Sharing Prompt with Organization
| Field | Value |
|-------|-------|
| **ID** | `ac389b5c-d768-495b-a55a-2a76d675711e` |
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/ai/prompts` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Screenshots** | 1 image |
| **Autonomy Score** | 3/5 (Arman +1, clearly a bug +1, not opinion +1, but DB/RLS risk 0, not simple 0) |

**Description:** "Row level security policy error" for table "Permissions" when sharing a prompt with an organization.

**Research:** `utils/permissions/service.ts` - `shareWithOrg()` (lines 140-204) inserts directly into `permissions` table without org membership verification. Need SECURITY DEFINER RPC function or RLS policy update.

- [ ] **Approve** | - [ ] **Tested**

---

### 7. Add Screenshot Paste/Capture to Bug Reporter
| Field | Value |
|-------|-------|
| **ID** | `ff39b841-293f-4b2a-ac21-390c906554d0` |
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/ai/prompts` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Autonomy Score** | 4/5 (Arman +1, not opinion +1, zero risk +1, existing hook available +1, moderately complex 0) |

**Description:** The bug reporting tool needs clipboard paste support for screenshots and an automated screenshot capture button.

**Research:**
- `components/layout/FeedbackButton.tsx` - Currently manual upload only
- `hooks/useScreenshot.ts` - Production-ready, uses html2canvas, returns fullSize/compressed/thumbnail
- Add paste handler (Ctrl+V) and "Capture" button using existing hook

- [ ] **Approve** | - [ ] **Tested**

---

### 8. Show Prompt Info in Prompt-App View
| Field | Value |
|-------|-------|
| **ID** | `f46cb12a-7782-48ff-a394-b30584372def` |
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/prompt-apps/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Autonomy Score** | 4/5 (Arman +1, not opinion +1, zero risk +1, simple addition +1, but needs data fetch 0) |

**Description:** When inside a prompt-app, show which prompt drives it and offer a link to the prompt builder.

**Research:**
- `features/prompt-apps/components/PromptAppEditor.tsx` - Has `app.prompt_id`
- Add prompt name display and link to `/ai/prompts/edit-redux/${app.prompt_id}` in "Basic Information" tab

- [ ] **Approve** | - [ ] **Tested**

---

### 9. Data Download Missing Records & Wrong Sort
| Field | Value |
|-------|-------|
| **ID** | `6b249e3c-617c-4dd3-ab63-6284e41aaa04` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/data/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Autonomy Score** | 3/5 (Arman +1, clearly a bug +1, not opinion +1, moderate complexity 0, some risk 0) |

**Description:** Data download/copy isn't getting all records (pagination issue) and doesn't respect the active sort.

**Research:**
- `components/user-generated-table-data/ExportTableModal.tsx` - doesn't receive sort state
- `components/user-generated-table-data/UserTableViewer.tsx` - has sort state but doesn't pass it
- DB functions `export_user_table_as_csv` and `get_user_table_complete` ignore sort
- Fix: pass sort state through, use `get_user_table_data_paginated` with large limit

- [ ] **Approve** | - [ ] **Tested**

---

### 10. Admin Feedback Images RLS Issue
| Field | Value |
|-------|-------|
| **ID** | `f300a3e0-153c-4329-b29a-797d60d6043c` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/administration/feedback` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Autonomy Score** | 4/5 (Arman +1, clearly a bug +1, not opinion +1, zero risk +1, moderate fix 0) |

**Description:** In admin feedback page, attached images can't be viewed due to RLS on storage.

**Research:**
- `app/(authenticated)/(admin-auth)/administration/feedback/components/FeedbackDetailDialog.tsx` (lines 207-224) - Uses raw `src={url}` without auth
- Use existing `useSignedUrl` hook or the new `/api/admin/feedback/images` endpoint we just built

- [ ] **Approve** | - [ ] **Tested**

---

### 11. User Feedback Status View (COMPLETED)
| Field | Value |
|-------|-------|
| **ID** | `3637e739-c400-4e37-b3fa-0c84a02e73b1` |
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/data/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Autonomy Score** | 5/5 |

**Description:** Add a feature where users can see their reported items and status.

**Status:** JUST COMPLETED as part of this feedback system build. User portal is at `/settings/feedback`. Ready for DB status update once you confirm.

- [x] **Approve** (auto-approved: built as part of system) | - [ ] **Tested**

---

### 12. Download/Copy Current Search & Single Row
| Field | Value |
|-------|-------|
| **ID** | `0b192ef8-8d22-4b2f-914e-91659e4bab3a` |
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/data/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Autonomy Score** | 3/5 (Arman +1, not opinion +1, zero risk +1, but moderate complexity 0, not simple 0) |

**Description:** Add ability to download/copy the current filtered search results (not just the full table). Also add row-level copy/download in the view/edit dialog.

**Research:** Related to #9, same files. `ExportTableModal.tsx`, `UserTableViewer.tsx`, `TableToolbar.tsx`. Implement "Export Current View" option and row-level export buttons.

- [ ] **Approve** | - [ ] **Tested**

---

### 13. Table Last Column Cut Off in Prompt Output
| Field | Value |
|-------|-------|
| **ID** | `fee2af21-d1e5-4cc0-8181-583c2f277a91` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/ai/prompts/run/...` |
| **User** | seo@titaniumsuccess.com |
| **Date** | 2026-02-02 |
| **Screenshots** | 1 image |
| **Autonomy Score** | 5/5 (clearly a bug +1, not opinion +1, zero risk +1, simple CSS fix +1, external user but obvious fix +1) |

**Description:** When a prompt generates a table, the last column is not fully visible and data is hidden.

**Research:**
- `components/mardown-display/blocks/table/StreamingTableRenderer.tsx` line 591
- Change `overflow-hidden` to `overflow-x-auto` to allow horizontal scrolling

- [ ] **Approve** | - [ ] **Tested**

---

### 14. Organization Email Sending
| Field | Value |
|-------|-------|
| **ID** | `1a523a09-ece1-4f97-b821-22a16c219f75` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/organizations/.../settings` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-01-30 |
| **Screenshots** | 1 image |
| **Autonomy Score** | 2/5 (Arman +1, not opinion +1, but significant scope 0, moderate risk 0, not simple 0) |

**Description:** Enable email sending from organization settings page. Email infrastructure (Resend) already exists.

**Research:**
- `features/organizations/components/OrgSettings.tsx` - Add "Email" tab
- Reuse `components/admin/EmailComposeSheet.tsx` and `lib/email/client.ts`
- Need new tab component with member email list and compose UI

- [ ] **Approve** | - [ ] **Tested**

---

## Priority Summary

### Auto-fixable (Score 4-5) -- Can fix without approval
| # | Item | Score | Complexity |
|---|------|-------|------------|
| 4 | Notes bottom padding | 5/5 | Simple CSS |
| 13 | Table overflow cut off | 5/5 | Single line CSS |
| 11 | User feedback portal | 5/5 | DONE |
| 3 | Multiple image attachments | 4/5 | Moderate |
| 7 | Screenshot paste/capture | 4/5 | Moderate |
| 8 | Prompt info in prompt-app | 4/5 | Moderate |
| 10 | Admin images RLS | 4/5 | Moderate |

### Needs Approval (Score 2-3) -- Present for review
| # | Item | Score | Complexity |
|---|------|-------|------------|
| 1 | Prompt editor scrolling | 3/5 | Complex |
| 6 | Org sharing RLS | 3/5 | DB changes |
| 9 | Data export sort/pagination | 3/5 | Moderate |
| 12 | Export current search | 3/5 | Moderate |
| 5 | Centralize contacts | 2/5 | Architecture |
| 14 | Org email sending | 2/5 | Large scope |
| 2 | Token/session management | 2/5 | Auth infrastructure |
