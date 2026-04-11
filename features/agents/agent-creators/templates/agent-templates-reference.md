# Agent Templates (`agx_agent_templates`)

Drop-in template system for agents. Same column structure as `agx_agent` with a few template-specific additions.

---

## Key Differences from Old `prompt_templates`

| Old (`prompt_templates`) | New (`agx_agent_templates`) |
|---|---|
| `model_id` buried in `settings` jsonb | Top-level `model_id` column |
| `tools` stored as names in `settings` | `tools uuid[]` column (IDs, not names) |
| `variable_defaults` | `variable_definitions` |
| `created_by_user_id` | `user_id` |
| No org/project/task scoping | Full scoping: `user_id`, `organization_id`, `project_id`, `task_id` |

**Template-only columns:** `is_featured boolean`, `use_count integer`

---

## Scoping & RLS

| Who | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| Anon | `is_public = true` only | ✗ | ✗ | ✗ |
| Authenticated (own) | `user_id = auth.uid()` | `user_id = auth.uid()` | ✓ | ✓ |
| Org member | Read all org templates | ✗ | Admin/Owner only | Admin/Owner only |
| Anyone | `is_public = true` | ✗ | ✗ | ✗ |

**System templates** = `is_public = true`, `user_id = NULL` (or system user). Readable by everyone.

**Company templates** = `organization_id` set, `is_public = false`. Readable by org members only.

---

## CRUD

```sql
-- List all available templates (RLS handles visibility automatically)
SELECT * FROM agx_agent_templates
WHERE is_archived = false
ORDER BY is_featured DESC, use_count DESC;

-- Filter by category
SELECT * FROM agx_agent_templates
WHERE category = 'education' AND is_archived = false;

-- Create a user template
INSERT INTO agx_agent_templates (name, description, messages, model_id, settings, user_id)
VALUES ('My Template', 'Description', '[...]'::jsonb, '<model-uuid>', '{}'::jsonb, auth.uid());

-- Create an org-scoped template
INSERT INTO agx_agent_templates (name, messages, user_id, organization_id)
VALUES ('Team Template', '[...]'::jsonb, auth.uid(), '<org-uuid>');

-- Update
UPDATE agx_agent_templates SET name = 'New Name' WHERE id = '<template-id>';

-- Soft delete
UPDATE agx_agent_templates SET is_archived = true WHERE id = '<template-id>';

-- Hard delete
DELETE FROM agx_agent_templates WHERE id = '<template-id>';
```

---

## RPC: Create Agent from Template

```sql
SELECT agx_create_agent_from_template('<template-id>');
-- Returns: uuid (the new agent's ID)
```

**What it does:**
1. Validates auth + access (public templates open to all, private templates check `check_resource_access`)
2. Copies all template fields into a new `agx_agent` row owned by the calling user
3. Sets `agent_type = 'user'`, `is_public = false`, org/project/task = `NULL`
4. Increments `use_count` on the template
5. Returns the new agent UUID

**Supabase client call:**
```ts
const { data, error } = await supabase.rpc('agx_create_agent_from_template', {
  p_template_id: templateId,
});
// data = new agent UUID
```

---

## Column Quick Reference

All columns match `agx_agent` exactly (so you can reuse the same types/interfaces), plus:

| Column | Type | Note |
|---|---|---|
| `is_featured` | `boolean` | For featuring system templates |
| `use_count` | `integer` | Auto-incremented by the RPC |
| `source_agent_id` | `uuid?` | If template was derived from an existing agent |

No `is_favorite` column — favorites live on the agent, not the template.
