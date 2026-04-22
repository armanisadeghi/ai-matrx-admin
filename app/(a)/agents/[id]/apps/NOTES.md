# `/agents/[id]/apps/` — Design Notes

This route is a **placeholder landing page**. Before it can ship with real
data, we need to agree on a few things. This file captures the open questions
so we can unblock it in a follow-up pass.

## What's already in place

- **Route** — `app/(a)/agents/[id]/apps/page.tsx`
- **Panel** — `features/agents/components/apps/AgentAppsPanel.tsx`
- **Linking** — the landing page links out to the existing App Builder
  (`/apps/app-builder/apps/list`, `/apps/app-builder/applets/list`) as a
  stop-gap so users aren't dead-ended here.

## Open questions (need a product decision)

### 1. What is an "app" in the context of an agent?

Today the schema distinguishes three things:

| Table                     | What it represents                                                 |
| ------------------------- | ------------------------------------------------------------------ |
| `custom_app_configs`      | A top-level "custom app" (shell, branding, layout type)            |
| `custom_applet_configs`   | An applet inside an app (has `app_id` + optional `compiled_recipe_id`) |
| `compiled_recipe` / recipes | What actually knows which agent is being invoked                 |

There is **no direct `agent_id` FK on `custom_app_configs` or
`custom_applet_configs`**. The agent shows up transitively via the compiled
recipe.

**Decision needed:** When the user says "apps I have for this agent", do we
mean:

- **(A)** Every **app** that contains at least one applet whose compiled
  recipe references this agent.
- **(B)** Every **applet** whose compiled recipe references this agent
  (flatter, more granular).
- **(C)** Both — show apps grouped into sections, with applets nested.

My default guess is **(C)**, but we should confirm before wiring the query.

### 2. Data source / RPC

RLS on `custom_app_configs` is likely gated on `user_id` / `is_public`, so a
plain `from("custom_app_configs").select(...)` from the client will only
return the user's own rows. For this page we probably want:

- Apps/applets owned by the current user that reference this agent
- Plus public apps/applets that reference this agent

The cleanest shape is a new RPC — same playbook we used for shortcuts:

```sql
-- sketch only — to be refined once we pick (A)/(B)/(C) above
create or replace function public.agx_list_apps_for_agent(
  p_agent_id uuid
) returns table (
  app_id uuid,
  app_name text,
  app_slug text,
  applet_id uuid,
  applet_name text,
  compiled_recipe_id uuid,
  ownership text  -- 'mine' | 'public' | 'org'
)
language sql stable security invoker as $$
  -- join custom_app_configs -> custom_applet_configs -> compiled_recipe
  -- where the recipe points at p_agent_id, and visibility passes RLS.
$$;
```

Once we pick (A)/(B)/(C), the RPC returns exactly the shape the panel needs —
no client-side joining.

### 3. CRUD entry-points from this page

The landing should probably offer:

- **Open app** → `/apps/app-builder/apps/[id]` (already exists)
- **Edit applet** → `/apps/app-builder/applets/[id]/edit` (already exists)
- **Create new app wired to this agent** → _new flow_, needs a decision on
  what the scaffold looks like (blank app? clone of a template? pick an
  existing recipe?).

For parity with the shortcuts route, a dedicated `/agents/[id]/apps/new` route
that pre-selects this agent in the recipe picker would be the obvious
follow-up, but it depends on (1) and (2) above.

### 4. Scope / visibility

Shortcuts model this via the `scope` column (`user`, `global`, `organization`,
`project`, `task`). Apps only have `user_id` + `is_public` + `public_read`.
Decide whether to surface a "Your apps / Public apps / Org apps" split the
same way shortcuts do — or whether to collapse everything into a single list.

### 5. Count cards

The placeholder panel shows three count cards:

1. Apps using this agent
2. Applets powered by this agent
3. Recipes referencing this agent

Once the RPC lands, all three numbers come from the same query. If we go with
option (B) above we can drop card (1), or collapse (1) and (3).

## Next steps

1. Confirm **(A)**, **(B)**, or **(C)** for the listing shape.
2. Write `agx_list_apps_for_agent` (or equivalent) as a Supabase migration.
3. Replace the placeholder panel body with a real fetch + list component,
   reusing the row/badge style from `AgentShortcutsPanel.tsx`.
4. (Optional) Add `/agents/[id]/apps/new` for the creation flow once the
   wiring story is clear.
