import { Group, Panel, Separator } from "react-resizable-panels";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata(
  "/ssr/demos/resizables/00-baseline",
  {
    title: "00 · Baseline 2-panel split + focus diagnostic",
    description:
      "Smallest possible v4 example, plus a focus-color diagnostic strip.",
  },
);

// Diagnostic strip: click each cell. Whichever COLOR wins on focus tells us
// which CSS property is drawing the "white halo" we keep chasing. If white
// still shows ON TOP of the labeled color, something else (browser UA style,
// library style, pseudo-element) is responsible. The cells are intentionally
// REPETITIVE in DOM shape (div tabindex=0, with and without role=separator)
// so the only variable is the focus treatment.
//
// Reading the results:
//   - Red wins   → it's the `outline` property (any-focus state)
//   - Green wins → it's `outline` but only on keyboard focus (focus-visible)
//   - Blue wins  → it's `box-shadow` / Tailwind `ring` (any-focus)
//   - Yellow wins→ it's `box-shadow` / `ring` keyboard-only (focus-visible)
//   - Purple wins→ it's `background-color` on focus
//   - Cyan wins  → it's `border-color` on focus
//   - Pink wins  → it's an inline outline declaration (highest CSS specificity)
//   - White wins anyway → something we haven't isolated yet (UA stylesheet,
//     library inline style, ::before pseudo, etc.)
function FocusCell({
  label,
  description,
  className = "",
  style,
  role,
  ariaOrientation,
}: {
  label: string;
  description: string;
  className?: string;
  style?: React.CSSProperties;
  role?: string;
  ariaOrientation?: "horizontal" | "vertical";
}) {
  return (
    <div className="space-y-1">
      <div
        tabIndex={0}
        role={role}
        aria-orientation={ariaOrientation}
        style={style}
        className={`h-10 rounded bg-muted text-foreground text-[11px] flex items-center justify-center px-2 cursor-pointer select-none ${className}`}
      >
        {label}
      </div>
      <p className="text-[10px] leading-tight text-muted-foreground px-1">
        {description}
      </p>
    </div>
  );
}

// SERVER COMPONENT. No 'use client' directive.
//
// Group / Panel / Separator each carry their own 'use client' inside the library,
// so we can render them directly from a Server Component as long as we don't
// pass any function props (those can't cross the RSC boundary). For persistence
// (cookie writes via onLayoutChanged) we wrap Group in a 'use client' component
// — see demo 01-cookie-ssr.
export default function ResizableBaselineDemo() {
  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden bg-textured">
      <header className="border-b border-border bg-card px-4 py-2">
        <h1 className="text-sm font-medium">
          Demo 00 — baseline 2-panel split + focus diagnostic
        </h1>
        <p className="text-xs text-muted-foreground">
          Click each diagnostic cell below. Reload returns panels to default
          50/50.
        </p>
      </header>

      {/* ============================================================
          FOCUS DIAGNOSTIC STRIP
          
          With the globals.css fix in place, clicking any of these cells
          should NEVER show a glaring white halo. The expected behavior:
          
          - Cells A / B / E / F / G / H: their LABELED color appears on focus
            (overrides the global default).
          - Cell C: always pink (inline style, never changes).
          - Cells D / I / J / K: show our themed --ring color (a subtle gray)
            because the global *:focus-visible rule kicks in.
          - Cell L: orange outline via !important.
          
          If you ever see WHITE on any cell, the global rule didn't catch
          something — check what property is winning in DevTools.
          ============================================================ */}
      <section className="border-b border-border bg-card px-4 py-3 space-y-2">
        <h2 className="text-xs font-medium text-foreground">
          Focus diagnostic — click each cell. None should ever show
          <span className="text-destructive font-semibold"> WHITE</span>.
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* ---------- OUTLINE TESTS ---------- */}
          <FocusCell
            label="A · focus:outline RED"
            description="Tailwind outline on any :focus (mouse + kbd). RED → it's outline."
            className="focus:outline-solid focus:outline-4 focus:outline-red-500"
          />
          <FocusCell
            label="B · focus-visible:outline GREEN"
            description="Outline only on :focus-visible (keyboard). GREEN on Tab → outline + focus-visible."
            className="focus-visible:outline-solid focus-visible:outline-4 focus-visible:outline-green-500"
          />
          <FocusCell
            label="C · inline style outline PINK"
            description="Inline :focus is impossible → forced static outline always pink. If white still drawn, it sits ABOVE inline outline."
            style={{ outline: "4px solid hotpink" }}
          />
          <FocusCell
            label="D · NO classes, plain div"
            description="Pure browser default. White here = UA stylesheet -webkit-focus-ring-color."
          />

          {/* ---------- RING / BOX-SHADOW TESTS ---------- */}
          <FocusCell
            label="E · focus:ring BLUE"
            description="Tailwind ring (box-shadow) on any :focus. BLUE → it's box-shadow."
            className="focus:ring-4 focus:ring-blue-500"
          />
          <FocusCell
            label="F · focus-visible:ring YELLOW"
            description="Ring on :focus-visible only. YELLOW on Tab → ring + focus-visible."
            className="focus-visible:ring-4 focus-visible:ring-yellow-500"
          />

          {/* ---------- BACKGROUND / BORDER TESTS ---------- */}
          <FocusCell
            label="G · focus:bg PURPLE"
            description="Background swap on focus. PURPLE → background-color is the culprit."
            className="focus:bg-purple-500"
          />
          <FocusCell
            label="H · focus:border CYAN"
            description="Border-color swap on focus. CYAN → border is the culprit."
            className="border-2 border-transparent focus:border-cyan-400"
          />

          {/* ---------- ROLE / ARIA TESTS — replicates library DOM ---------- */}
          <FocusCell
            label="I · role=separator (NO styles)"
            description="div tabindex=0 role=separator aria-orientation=vertical — same DOM shape as react-resizable-panels Separator. Pure UA behavior."
            role="separator"
            ariaOrientation="vertical"
          />
          <FocusCell
            label="J · role=separator + outline:none INLINE"
            description="Same as I but inline outline:none. If white still shows, outline ISN'T the source."
            role="separator"
            ariaOrientation="vertical"
            style={{ outline: "none" }}
          />
          <FocusCell
            label="K · role=separator + box-shadow none INLINE"
            description="Inline box-shadow:none + outline:none. If white STILL shows, neither outline nor box-shadow is the source."
            role="separator"
            ariaOrientation="vertical"
            style={{ outline: "none", boxShadow: "none" }}
          />
          <FocusCell
            label="L · role=separator + focus:outline ORANGE !important"
            description="Forces orange outline via !important. If still white, something has higher specificity than !important — extremely rare."
            role="separator"
            ariaOrientation="vertical"
            className="[&:focus]:!outline-4 [&:focus]:!outline-orange-500 [&:focus]:!outline-solid"
          />
        </div>

        <details className="text-[10px] text-muted-foreground mt-2">
          <summary className="cursor-pointer select-none">
            How to interpret what you see
          </summary>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>
              <strong>Red on A</strong> + still white halo → there are TWO focus
              indicators stacking. Red is from outline, white must be from
              box-shadow or another property.
            </li>
            <li>
              <strong>Pure white on all of A–L</strong> → it&apos;s coming from
              somewhere we haven&apos;t covered (a global stylesheet rule, the
              library&apos;s injected CSS, or a pseudo-element).
            </li>
            <li>
              <strong>White only on D and I</strong> → it&apos;s purely the UA
              focus ring and any of A/B/E/F overrides eliminate it. Then the
              global fix needs to set our own outline/ring on every focusable.
            </li>
            <li>
              <strong>White still on J or K</strong> → it&apos;s NOT outline and
              NOT box-shadow. Inspect the element in DevTools and look at the
              &quot;User agent stylesheet&quot; section.
            </li>
          </ul>
        </details>
      </section>

      {/* ============================================================
          ORIGINAL RESIZABLE PANELS (separator has NO focus:outline-none)
          ============================================================ */}
      <div className="flex-1 overflow-hidden">
        <Group
          id="demo-baseline"
          orientation="horizontal"
          className="h-full w-full"
        >
          <Panel id="left" defaultSize="50%" minSize="20%">
            <div className="h-full p-4 bg-muted">
              <h2 className="text-sm font-medium mb-2">Left panel</h2>
              <p className="text-xs text-muted-foreground">
                Drag the separator to resize. Click it without dragging — what
                color halo appears?
              </p>
            </div>
          </Panel>

          {/* INTENTIONALLY no focus:outline-none here. We want the bug to
              reproduce so the diagnostic above can identify the source. */}
          <Separator className="w-0.5 bg-border data-[separator=hover]:bg-primary data-[separator=focus]:bg-primary data-[separator=dragging]:bg-primary transition-colors cursor-col-resize" />

          <Panel id="right" defaultSize="50%" minSize="20%">
            <div className="h-full p-4 bg-card">
              <h2 className="text-sm font-medium mb-2">Right panel</h2>
              <p className="text-xs text-muted-foreground">
                Both panels have{" "}
                <code className="text-foreground">minSize=&quot;20%&quot;</code>
                .
              </p>
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
