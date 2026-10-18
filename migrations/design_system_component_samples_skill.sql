-- ============================================================================
-- Skill: design-system-component-samples — how an agent writes the rows of a
-- design system's Components table, whose `sample` column is an HTML sample
-- (records-ui look `html_sample`: drawn sandboxed, markup + CSS only, seamless,
-- auto-height, the theme's tokens as CSS variables). Opt-in: reaches an agent's
-- prompt only when listed in agx_agent.skill_config.included.
-- Idempotent: insert WHERE NOT EXISTS, then the body refreshed by its business key.
-- ============================================================================

INSERT INTO skill.definition
  (skill_id, label, description, skill_type, body, icon_name,
   is_active, is_system, visibility, organization_id, sort_order, semver, platform_targets)
SELECT
  'design-system-component-samples',
  'Design system component samples',
  'How to write the Components table of a design system: one component family per row, each with a live HTML sample (inline styles, the theme''s CSS variables only) and a short usage note.',
  'convention',
  '',
  'Component',
  true, true, 'public',
  '39c38960-d30c-4840-b0c1-c9960de95582'::uuid,   -- the platform's own skills' organization (as svg-illustrations)
  10, '1.0.0', '["web"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM skill.definition
  WHERE skill_id = 'design-system-component-samples'
    AND organization_id = '39c38960-d30c-4840-b0c1-c9960de95582'::uuid
);

UPDATE skill.definition
SET body = $SKILL_BODY$# Design system component samples

A design system board has a **Components** table. Each row is ONE component family
(Button, Text field, Card, Badge, Toggle list, Collapsible list, Tabs…). Its columns:

| Column | What to write |
|---|---|
| `name` | The family's name, as people say it: "Button", "Text field". |
| `group` | One of the table's groups (Actions, Inputs, Containers, Status, Selection, Disclosure). |
| `sample` | A piece of HTML that SHOWS the family: several states side by side. |
| `usage_note` | One short sentence: when to use it, and the one rule people get wrong. |

Write MANY rows — every family the product uses — never one row holding everything.

## How a sample is drawn (so write for it)

The sample is drawn inside the section card, exactly as it looks:

- **Markup and CSS only.** It is sandboxed: `<script>`, event handlers (`onclick`), forms that
  submit, external stylesheets and network requests do nothing. Use plain HTML elements and one
  inline `<style>` block. Native interactive elements still work (a checkbox toggles, `<details>`
  opens), so prefer them for interactive families.
- **Seamless.** It sits on the card itself: transparent, no border, no padding around it. NEVER give
  `html`, `body` or your outer wrapper a background, a border, a margin, a fixed width or a height.
- **Auto height.** The frame grows to the sample's height and never scrolls. Never set
  `height`/`max-height`/`overflow` on the outer element; never use `position: fixed`, `100vh` or
  `100%` heights. Lay states out in a wrapping row (`display:flex; flex-wrap:wrap; gap:8px`) or a
  responsive grid (`grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`), so it reads at any width.
- **Light and dark come free — through the variables.** The sample receives the theme's tokens as
  CSS variables and they change with the theme. Use ONLY these for colour and corner radius:

  `--background` `--foreground` `--card` `--card-foreground` `--popover` `--popover-foreground`
  `--muted` `--muted-foreground` `--primary` `--primary-foreground` `--secondary`
  `--secondary-foreground` `--accent` `--accent-foreground` `--destructive`
  `--destructive-foreground` `--success` `--warning` `--border` `--input` `--ring` `--radius`

  Write `background: var(--primary); color: var(--primary-foreground)`. A fixed colour (`#1f4fe0`,
  `rgb(…)`) does not follow the theme and the card flags it; a fallback inside `var()` is fine
  (`var(--primary, #1f4fe0)`). Mixing is fine too: `color-mix(in srgb, var(--ring) 25%, transparent)`.
  Shadows may use a hex colour with alpha (`#0f172a14`). The body's text colour is already
  `var(--foreground)` and its font is the app's; size text in px (13–15px for controls).
- **Short class names, scoped by the sample.** Each sample is its own document, so `.b`, `.r`, `.p`
  never collide with another row.

## One family, several states

Show what a builder needs to see, side by side, labelled by their own text:

- Button: default · hover · focus (a ring: `box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring)`) · disabled.
- Button variants: secondary · outline · quiet · danger, one row.
- Text field: label above · hint below · an error state (border and hint in `var(--destructive)`).
- Badge: neutral · primary · success · warning · failed.
- Toggle list: on · off · disabled (a checkbox styled as a switch; `appearance:none`).
- Collapsible list: `<details>`/`<summary>`, first one `open`.
- Card: a title, one line of detail in `var(--muted-foreground)`, at most two actions.

## Example row

```json
{
  "name": "Button",
  "group": "Actions",
  "sample": "<style>.r{display:flex;flex-wrap:wrap;gap:8px}.b{font:inherit;font-size:13px;font-weight:500;height:32px;padding:0 14px;border-radius:var(--radius);border:1px solid transparent;background:var(--primary);color:var(--primary-foreground)}.f{box-shadow:0 0 0 2px var(--background),0 0 0 4px var(--ring)}.b:disabled{opacity:.5}</style><div class=\"r\"><button class=\"b\">Save</button><button class=\"b f\">Focus</button><button class=\"b\" disabled>Disabled</button></div>",
  "usage_note": "The one main action of a screen. Never two primary buttons side by side."
}
```

## Usage notes

One sentence, under 90 characters, in plain words: where it goes and the rule that keeps it right
("A switch takes effect at once; use a checkbox when a Save button follows."). No marketing words.

## Editing a row

Return the WHOLE new sample for the row (it replaces the old one), keep its states, keep using the
variables. To change a colour for every component, change the token in the Colors table, never the
samples.
$SKILL_BODY$,
    updated_at = now()
WHERE skill_id = 'design-system-component-samples'
  AND organization_id = '39c38960-d30c-4840-b0c1-c9960de95582'::uuid;
