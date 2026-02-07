# User Feedback Tasks

> **Source of truth:** Supabase `user_feedback` table (queried via MCP)
> **Last synced:** 2026-02-07
> **Summary:** 23 total | 9 new | 1 awaiting_review | 10 closed | 3 wont_fix

## Workflow

1. Review items below and check **Approve** for items you want fixed
2. I fix approved items (auto-fix for score 4-5, ask first for lower)
3. You test and check **Tested**
4. I update DB status and remove from this list

---

## AWAITING REVIEW (1)

### Show Feedback Link + Stats in Submission Confirmation (360b24a1)
| Field | Value |
|-------|-------|
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/dashboard` |
| **User** | arman26@gmail.com |
| **Score** | 4/5 | **Fixed** | 2026-02-07 |

**Original:** After submitting feedback, show a link to the feedback portal and quick stats.

**Fix:** Enhanced the Thank You message to fetch user's feedback stats (total/pending/resolved) and display them with a "View all your submissions" link to `/settings/feedback`. Replaced auto-close with a manual Close button.

**Test:**
- Open the feedback form and submit any feedback
- Confirm the Thank You message shows **stats** (Submitted / Pending / Resolved counts)
- Confirm **"View all your submissions"** link appears and navigates to `/settings/feedback`
- Confirm the **Close** button dismisses the form

- [ ] **Tested**

---

## NEW Items (9)

### 1. Markdown Tables Maximum Recursion Error (2 reports)
| Field | Value |
|-------|-------|
| **IDs** | `b28af3fe` + `dc7a1327` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/notes`, `/ai/prompts/edit/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-07 |
| **Autonomy Score** | 3/5 |

**Description:** Markdown tables cause "Maximum update depth exceeded" error. Stack trace points to `EnhancedChatMarkdown.tsx:189` where `setCurrentContent(content)` in a `useEffect` creates an infinite render loop. Intermittent but reproducible with certain table formats.

**Note:** Dedicated focus task -- requires careful investigation of the markdown rendering pipeline.

- [ ] **Approve** | - [ ] **Tested**

---

### 2. Prompt Builder Editor Auto-Scrolling Bug
| Field | Value |
|-------|-------|
| **ID** | `0cbf8e6f-3416-48bf-8fc5-6c1c66007812` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/ai/prompts/edit/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-07 |
| **Autonomy Score** | 3/5 |

**Description:** When typing in the system prompt editor (3-6 pages of text), the UI auto-scrolls to the top instead of staying where the user is typing. Related to save behavior or scroll restoration.

- [ ] **Approve** | - [ ] **Tested**

---

### 3. Token Management - Session Expired Prematurely
| Field | Value |
|-------|-------|
| **ID** | `fd392160-85f0-42f0-879c-d93dfd678737` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/ai/prompts/edit/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-07 |
| **Autonomy Score** | 2/5 |

**Description:** Sessions expiring before the weekly Supabase limit. Error: `Invalid Refresh Token: Session Expired (Revoked by Newer Login)`. Likely multiple tabs/devices revoking each other's sessions.

- [ ] **Approve** | - [ ] **Tested**

---

### 4. Centralize Contacts List for Sharing
| Field | Value |
|-------|-------|
| **ID** | `dae0f40e-3d9b-45cb-875e-87b9dce818f0` |
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/ai/prompts` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Autonomy Score** | 2/5 |

**Description:** Contacts from the email system not available when sharing prompts. Need centralized user lookup.

- [ ] **Approve** | - [ ] **Tested**

---

### 5. RLS Error Sharing Prompt with Organization
| Field | Value |
|-------|-------|
| **ID** | `ac389b5c-d768-495b-a55a-2a76d675711e` |
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/ai/prompts` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Screenshots** | 1 image |
| **Autonomy Score** | 3/5 |

**Description:** "Row level security policy error" for table "Permissions" when sharing a prompt with an organization.

- [ ] **Approve** | - [ ] **Tested**

---

### 6. Data Download Missing Records & Wrong Sort
| Field | Value |
|-------|-------|
| **ID** | `6b249e3c-617c-4dd3-ab63-6284e41aaa04` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/data/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Autonomy Score** | 3/5 |

**Description:** Data download/copy isn't getting all records (pagination issue) and doesn't respect the active sort.

- [ ] **Approve** | - [ ] **Tested**

---

### 7. Download/Copy Current Search & Single Row
| Field | Value |
|-------|-------|
| **ID** | `0b192ef8-8d22-4b2f-914e-91659e4bab3a` |
| **Type** | Feature | **Priority** | Medium |
| **Route** | `/data/...` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-02-03 |
| **Autonomy Score** | 3/5 |

**Description:** Add ability to download/copy current filtered search results and row-level export.

- [ ] **Approve** | - [ ] **Tested**

---

### 8. Organization Email Sending
| Field | Value |
|-------|-------|
| **ID** | `1a523a09-ece1-4f97-b821-22a16c219f75` |
| **Type** | Bug | **Priority** | Medium |
| **Route** | `/organizations/.../settings` |
| **User** | arman@armansadeghi.com |
| **Date** | 2026-01-30 |
| **Screenshots** | 1 image |
| **Autonomy Score** | 2/5 |

**Description:** Enable email sending from organization settings page.

- [ ] **Approve** | - [ ] **Tested**

---

## Recently Closed (10)
| Item | Resolved |
|------|----------|
| X button on feature notification | 2026-02-07 |
| Multiple image attachments | 2026-02-07 |
| Screenshot paste support | 2026-02-07 |
| Prompt info in prompt-app view | 2026-02-07 |
| Notes bottom padding | 2026-02-07 |
| Admin feedback images RLS | 2026-02-07 |
| User feedback portal | 2026-02-07 |
| Table overflow cut off | 2026-02-07 |
| Sharing button visibility | 2026-02-03 |
| Test item | 2025-10-24 |

## Won't Fix (3)
| Item | Reason |
|------|--------|
| Draggable feedback modal | Paste feature addresses core need; drag adds complexity without sufficient benefit |
| "just test this feature" | Test submission |
| "test" | Test submission |
