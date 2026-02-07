# User Feedback Tasks

> **Source of truth:** Supabase `user_feedback` table (queried via MCP)
> **Last synced:** 2026-02-07
> **Summary:** 23 total | 11 new | 4 awaiting_review | 6 closed | 2 wont_fix

## Workflow

1. Review items below and check **Approve** for items you want fixed
2. I fix approved items (auto-fix for score 4-5, ask first for lower)
3. You test and check **Tested**
4. I update DB status and remove from this list

---

## AWAITING REVIEW (4)

These fixes are deployed and need your testing.

### X Button on Feature Notification Opens Bug Form (eb1e665b)
| Field | Value |
|-------|-------|
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/dashboard` |
| **User** | arman26@gmail.com |
| **Score** | 4/5 | **Fixed** | 2026-02-07 |

**Original:** The X button on the "NEW! Report bugs & issues" bouncing tooltip opens the feedback form instead of dismissing the notification.

**Fix:** Added `onPointerDown` with `stopPropagation`/`preventDefault` to the X button. Radix UI's DropdownMenuTrigger listens to pointer events, not just click events. The existing `onClick` `stopPropagation` was insufficient.

**Test:**
- Open any page (ensure `feedbackFeatureViewCount < 5` in preferences or reset it)
- See the bouncing "NEW! Report bugs & issues" tooltip below the bug icon
- Click the X button on the tooltip
- Confirm it **dismisses** the tooltip and does NOT open the feedback form

- [ ] **Tested**

---

### Multiple Image Attachments in Bug Reporter (12ddfc4e)
| Field | Value |
|-------|-------|
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/ai/prompts/edit/...` |
| **User** | arman@armansadeghi.com |
| **Score** | 4/5 | **Fixed** | 2026-02-07 |

**Original:** Feedback form should allow attaching multiple images without a complex UI.

**Fix:** Replaced FileUploadWithStorage with custom image handling. Now shows three action buttons (Upload, Paste, Capture) with image thumbnails below. Thumbnails have hover-to-reveal remove buttons.

**Test:**
- Open the feedback form (Bug icon in header)
- Click **Upload** and select multiple images
- Confirm thumbnails appear in a grid below the buttons
- Hover over a thumbnail and click X to remove one
- Submit feedback and confirm all remaining images are saved

- [ ] **Tested**

---

### Screenshot Paste & Capture in Bug Reporter (ff39b841)
| Field | Value |
|-------|-------|
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/ai/prompts` |
| **User** | arman@armansadeghi.com |
| **Score** | 4/5 | **Fixed** | 2026-02-07 |

**Original:** Bug tool needs clipboard paste and automated screenshot capture.

**Fix:** Added: (1) Global Ctrl+V paste handler that detects clipboard images and auto-uploads them, (2) Paste button using Clipboard API read(), (3) Capture button using existing `useScreenshot` hook (html2canvas) that captures the full page excluding the feedback dropdown.

**Test:**
- Open the feedback form
- Copy an image to clipboard (screenshot, browser copy, etc.)
- Press **Ctrl+V** -- confirm image uploads and thumbnail appears
- Click **Paste** button -- confirm it works (or shows "Tip: Copy an image first")
- Click **Capture** button -- confirm it captures a screenshot of the page behind the form
- Confirm the feedback dropdown itself is NOT visible in the capture

- [ ] **Tested**

---

### Prompt Info & Link in Prompt-App View (f46cb12a)
| Field | Value |
|-------|-------|
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/prompt-apps/...` |
| **User** | arman@armansadeghi.com |
| **Score** | 4/5 | **Fixed** | 2026-02-07 |

**Original:** When inside a prompt-app, show which prompt drives it and link to prompt builder.

**Fix:** Added "Powered by Prompt" section in the Basic Information tab. Fetches prompt name from DB and displays it with a wand icon, clickable link, and "Open in Prompt Builder" badge.

**Test:**
- Go to **http://localhost:3000/prompt-apps** and open any prompt-app
- In the **Basic Information** tab, look for "Powered by Prompt" section
- Confirm it shows the prompt name (not "Loading prompt...")
- Click the prompt name link -- confirm it navigates to `/ai/prompts/edit-redux/<id>`
- Click the "Open in Prompt Builder" badge -- same navigation

- [ ] **Tested**

---

## NEW Items (11)

### 1. Show Feedback Link in Submission Confirmation
| Field | Value |
|-------|-------|
| **ID** | `360b24a1-95b8-4578-89db-75947ec3359e` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/dashboard` |
| **User** | arman26@gmail.com |
| **Date** | 2026-02-07 |
| **Autonomy Score** | 2/5 (not admin email +0, feature request +0, not opinion +1, low risk +1, moderate complexity +0) |

**Description:** After submitting feedback, the success message should include a link to `/settings/feedback` where users can track their submissions. Optionally show quick stats (total submitted, pending, resolved).

**Research:** `components/layout/FeedbackButton.tsx` -- the `submitted` state renders a simple "Thank You!" message. Add a link and quick fetch from `get_user_own_feedback` to show counts.

- [ ] **Approve** | - [ ] **Tested**

---

### 2. Make Feedback Modal Draggable
| Field | Value |
|-------|-------|
| **ID** | `8acd305d-043d-4099-8ddd-a4110d374ef7` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/dashboard` |
| **User** | arman26@gmail.com |
| **Date** | 2026-02-07 |
| **Autonomy Score** | 2/5 (not admin email +0, feature request +0, not opinion +1, low risk +1, not simple +0) |

**Description:** The feedback form covers the bug you're trying to report. It should be draggable/repositionable. Alternatively, it could hold state so you can close and reopen without losing your text.

**Research:** Currently uses `DropdownMenu` which can't be repositioned. Options: (1) Convert to a draggable floating panel using a custom component, (2) Add state persistence so closing and reopening retains form data. Option 2 is simpler and may be sufficient given the new Capture screenshot feature.

- [ ] **Approve** | - [ ] **Tested**

---

### 3. Markdown Tables Maximum Recursion Error (Detailed)
| Field | Value |
|-------|-------|
| **ID** | `b28af3fe-97d9-4746-8b6d-0c6a35e67060` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/notes` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-07 |
| **Autonomy Score** | 3/5 (Arman +1, clearly a bug +1, not opinion +1, some risk to markdown rendering +0, complex fix +0) |

**Description:** Markdown tables with specific formats cause "Maximum update depth exceeded" error. Stack trace points to `EnhancedChatMarkdown.tsx:189` where `setCurrentContent(content)` creates an infinite loop in `useEffect`.

**Research:**
- `components/mardown-display/chat-markdown/EnhancedChatMarkdown.tsx` line 189
- The `useEffect` triggers `setCurrentContent(content)` which re-renders, which triggers the effect again
- Likely a reference equality issue: `content` prop changes identity on each render even when the string value is the same
- Related to item #4 below (same root cause)

- [ ] **Approve** | - [ ] **Tested**

---

### 4. Markdown Tables Intermittent Max Depth Error
| Field | Value |
|-------|-------|
| **ID** | `dc7a1327-cd93-41cb-969f-e0bddedc5d9a` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/ai/prompts/edit/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-07 |
| **Autonomy Score** | 3/5 (same as #3 -- duplicate report, same root cause) |

**Description:** Same issue as #3 above. Markdown table display intermittently causes max depth error. Not consistent but reproducible.

**Note:** This is a **duplicate** of #3. Should be resolved together.

- [ ] **Approve** | - [ ] **Tested**

---

### 5. Prompt Builder Editor Auto-Scrolling Bug
| Field | Value |
|-------|-------|
| **ID** | `0cbf8e6f-3416-48bf-8fc5-6c1c66007812` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/ai/prompts/edit/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-07 |
| **Autonomy Score** | 3/5 (Arman +1, clearly a bug +1, not opinion +1, but complex fix with risk 0, not simple 0) |

**Description:** When typing in the system prompt editor (3-6 pages of text), the UI auto-scrolls to the top instead of staying where the user is typing. Every few characters causes 3-4 pages of unwanted scrolling. Related to save behavior, refreshes, or scroll restoration.

**Research:** Start at `app/(authenticated)/ai/prompts/edit/[id]/page.tsx`. The scrolling container holds model selection, settings, variables, system prompt, and messages. Likely `scrollIntoView` or focus restoration triggered during auto-save.

- [ ] **Approve** | - [ ] **Tested**

---

### 6. Token Management - Session Expired Prematurely
| Field | Value |
|-------|-------|
| **ID** | `fd392160-85f0-42f0-879c-d93dfd678737` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/ai/prompts/edit/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-07 |
| **Autonomy Score** | 2/5 (Arman +1, clearly a bug +1, but auth is high-risk 0, not simple 0, needs investigation 0) |

**Description:** Sessions expiring before the weekly Supabase limit. Error: `Invalid Refresh Token: Session Expired (Revoked by Newer Login)`. Token management should silently refresh for valid users instead of logging them out.

**Research:** Check Supabase auth config, token refresh logic, and whether multiple tabs/devices revoke each other's sessions. This is an auth infrastructure issue requiring careful investigation.

- [ ] **Approve** | - [ ] **Tested**

---

### 7. Centralize Contacts List for Sharing
| Field | Value |
|-------|-------|
| **ID** | `dae0f40e-3d9b-45cb-875e-87b9dce818f0` |
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/ai/prompts` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Autonomy Score** | 2/5 (Arman +1, not opinion +1, but architecture decision 0, moderate risk 0, not simple 0) |

**Description:** Contacts from the email system not available when sharing prompts. Need centralized user lookup so contacts work everywhere.

**Research:** Email system at `/app/(authenticated)/admin/email/page.tsx`. Sharing at `/features/sharing/components/tabs/ShareWithUserTab.tsx`. Both use RPCs independently. Need a shared service/hook.

- [ ] **Approve** | - [ ] **Tested**

---

### 8. RLS Error Sharing Prompt with Organization
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

**Research:** `utils/permissions/service.ts` - `shareWithOrg()` inserts directly into `permissions` table without org membership verification. Need SECURITY DEFINER RPC or RLS policy update.

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

**Research:** `components/user-generated-table-data/ExportTableModal.tsx` doesn't receive sort state. DB functions ignore sort. Fix: pass sort state through and use paginated function with large limit.

- [ ] **Approve** | - [ ] **Tested**

---

### 10. Download/Copy Current Search & Single Row
| Field | Value |
|-------|-------|
| **ID** | `0b192ef8-8d22-4b2f-914e-91659e4bab3a` |
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/data/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Autonomy Score** | 3/5 (Arman +1, not opinion +1, zero risk +1, but moderate complexity 0, not simple 0) |

**Description:** Add ability to download/copy current filtered search results (not just full table). Also add row-level copy/download in the view/edit dialog.

**Research:** Related to #9, same files. Implement "Export Current View" and row-level export buttons.

- [ ] **Approve** | - [ ] **Tested**

---

### 11. Organization Email Sending
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

**Research:** `features/organizations/components/OrgSettings.tsx` - Add "Email" tab. Reuse `components/admin/EmailComposeSheet.tsx` and `lib/email/client.ts`.

- [ ] **Approve** | - [ ] **Tested**

---

## Priority Summary

### Auto-fixable (Score 4-5) -- All fixed, awaiting review
| # | Item | Score | Status |
|---|------|-------|--------|
| - | X button bug | 4/5 | Awaiting review |
| - | Multiple image attachments | 4/5 | Awaiting review |
| - | Screenshot paste/capture | 4/5 | Awaiting review |
| - | Prompt info in prompt-app | 4/5 | Awaiting review |

### Needs Approval (Score 2-3)
| # | Item | Score | Complexity |
|---|------|-------|------------|
| 3+4 | Markdown table recursion (2 reports) | 3/5 | Complex |
| 5 | Prompt editor scrolling | 3/5 | Complex |
| 8 | Org sharing RLS | 3/5 | DB changes |
| 9 | Data export sort/pagination | 3/5 | Moderate |
| 10 | Export current search | 3/5 | Moderate |
| 1 | Show feedback link in confirmation | 2/5 | Simple-Moderate |
| 2 | Make feedback modal draggable | 2/5 | Moderate |
| 6 | Token/session management | 2/5 | Auth infrastructure |
| 7 | Centralize contacts | 2/5 | Architecture |
| 11 | Org email sending | 2/5 | Large scope |

### Recently Closed (6)
| Item | Resolved |
|------|----------|
| Notes bottom padding | 2026-02-07 |
| Admin feedback images RLS | 2026-02-07 |
| User feedback portal | 2026-02-07 |
| Table overflow cut off | 2026-02-07 |
| Sharing button visibility | 2026-02-03 |
| Test item | 2025-10-24 |
