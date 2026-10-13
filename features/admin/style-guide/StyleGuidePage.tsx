"use client";

// THE living style guide: every rule of common-docs/systems/platform/ui-shell/STYLE-GUIDE.md
// rendered with the real components. If this page and the written guide disagree, fix the
// wrong one in the same change. The "Don't" samples are deliberately wrong and live in
// __fixtures__/counter-examples.tsx, which the UI guards skip.

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  Crown,
  Download,
  FileText,
  Globe,
  Inbox,
  Lock,
  Plus,
  Search,
  Zap,
} from "lucide-react";
import {
  Badge,
  Button,
  CHIP_TONES,
  Chip,
  ChipSet,
  ControlRow,
  DeleteButton,
  DisclosureHeader,
  EmptyState,
  Field,
  IndicatorStrip,
  PropertyRow,
  RegionSkeleton,
  RowGroup,
  SearchField,
  SegmentedControl,
  Select,
  SettingRow,
  Switch,
  Tabs,
  Tile,
  type BadgeTone,
} from "@ai-matrx/design-system/controls";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { JsonInspector } from "@/components/official-candidate/json-inspector/JsonInspector";
import {
  BadProvisionRows,
  BadGreys,
  BadColours,
  BadSurfaces,
  BadStates,
  BadProse,
} from "./__fixtures__/counter-examples";

const SECTIONS = [
  { id: "basics", label: "The twelve basics" },
  { id: "examples", label: "Do and don't" },
  { id: "type", label: "Text styles" },
  { id: "colour", label: "Colour" },
  { id: "spacing", label: "Spacing" },
  { id: "components", label: "Components" },
  { id: "data", label: "Reading data" },
  { id: "states", label: "States" },
] as const;

const BASICS: { title: string; line: string }[] = [
  {
    title: "Use the component for the job",
    line: "Styling by hand means you are rebuilding one",
  },
  {
    title: "Text uses a named style",
    line: "type-title, body, secondary, meta, label, value",
  },
  {
    title: "Two text colours",
    line: "Foreground for content, muted for the rest",
  },
  {
    title: "Colour has meaning",
    line: "Status tokens and chip tones, never a palette",
  },
  {
    title: "One strongest line",
    line: "What they came to read wins; the rest steps down",
  },
  {
    title: "Labels touch their values",
    line: "Help text goes in the info tooltip",
  },
  { title: "One left edge", line: "Arrows and icons hang in their own margin" },
  {
    title: "A fill means act on this",
    line: "Never a box behind a value you only read",
  },
  {
    title: "Typewriter is for code",
    line: "Ids, JSON, keys — never names or prose",
  },
  {
    title: "One surface level",
    line: "Page, then card. No card inside a card",
  },
  {
    title: "Every state is designed",
    line: "Missing, empty, loading and error",
  },
  {
    title: "No prose on screen",
    line: "One title, one-line hints, ≤60 characters",
  },
];

const TYPE_STYLES: {
  cls: string;
  spec: string;
  use: string;
  sample: string;
}[] = [
  {
    cls: "type-title",
    spec: "13 / 500",
    use: "Row name, card or section title",
    sample: "Full Spectrum Search Group",
  },
  {
    cls: "type-body",
    spec: "13 / 400",
    use: "Running text",
    sample: "Profiles found on the web for this brand.",
  },
  {
    cls: "type-secondary",
    spec: "12",
    use: "One-line hint or caption",
    sample: "Matched by domain and name",
  },
  {
    cls: "type-meta",
    spec: "11",
    use: "Times, counts, sizes, ids",
    sample: "17 items · 8,888 chars · 2 min ago",
  },
  {
    cls: "type-label",
    spec: "11 / 500 grey",
    use: "The name above a read-only value",
    sample: "Website domain",
  },
  {
    cls: "type-value",
    spec: "14 / 400 black",
    use: "The read-only value",
    sample: "fullspecstaff.com",
  },
];

const SWATCHES: { token: string; use: string }[] = [
  { token: "background", use: "Page" },
  { token: "card", use: "Card" },
  { token: "muted", use: "Control, code" },
  { token: "border", use: "Every border" },
  { token: "foreground", use: "Content text" },
  { token: "muted-foreground", use: "Everything else" },
  { token: "primary", use: "Main action" },
  { token: "success", use: "Done, healthy" },
  { token: "warning", use: "Needs a look" },
  { token: "destructive", use: "Failed, delete" },
  { token: "info", use: "Running, note" },
];

const BADGE_TONES: BadgeTone[] = [
  "neutral",
  "primary",
  "success",
  "warning",
  "destructive",
  "info",
];
const SPACING = [
  { cls: "gap-1", px: 4 },
  { cls: "gap-2", px: 8 },
  { cls: "gap-3", px: 12 },
  { cls: "gap-4", px: 16 },
  { cls: "gap-6", px: 24 },
];

const WEB_CANDIDATES = [
  {
    url: "https://www.bbb.org/us/ca/laguna-hills/profile/staffing-agencies/full-spectrum-search-group",
    label: "BBB",
    certainty: "likely",
  },
  {
    url: "https://www.facebook.com/fullspecstaff",
    label: "Full Spectrum Search Group",
    certainty: "certain",
  },
  {
    url: "https://www.yelp.com/biz/full-spectrum-search-group",
    label: "Yelp",
    certainty: "possible",
  },
];

export function StyleGuidePage() {
  return (
    <>
      <RecordPageHeader
        backHref="/administration/ui"
        parents={[{ label: "UI", href: "/administration/ui" }]}
        record={{ name: "Style guide" }}
      />
      <div className="h-full min-h-0 overflow-y-auto" data-matrx-page-scroll>
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
          <nav aria-label="Sections" className="hidden lg:block">
            <ol className="sticky top-8 flex flex-col gap-1">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="type-secondary text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <main className="flex min-w-0 flex-col gap-14">
            <Basics />
            <Examples />
            <TypeStyles />
            <Colour />
            <Spacing />
            <Components />
            <ReadingData />
            <States />
          </main>
        </div>
      </div>
    </>
  );
}

function Section({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-4">
      <header className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
        <h2 className="type-title text-foreground">{title}</h2>
        {meta ? (
          <span className="type-meta text-muted-foreground">{meta}</span>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-card ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

// ── 1. The twelve basics ─────────────────────────────────────────────────────────────────
function Basics() {
  return (
    <Section
      id="basics"
      title="The twelve basics"
      meta="Read once, follow always"
    >
      <ol className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {BASICS.map((b, i) => (
          <li
            key={b.title}
            className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2"
          >
            <span className="type-meta pt-0.5 text-muted-foreground tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="type-title text-foreground">{b.title}</span>
              <span className="type-secondary text-muted-foreground">
                {b.line}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// ── 2. Do and don't ──────────────────────────────────────────────────────────────────────
function Pair({
  title,
  rule,
  good,
  bad,
}: {
  title: string;
  rule: string;
  good: ReactNode;
  bad: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <span className="type-title text-foreground">{title}</span>
        <span className="type-meta text-muted-foreground">{rule}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="flex flex-col gap-3 p-4">
          <Badge tone="success" className="self-start">Do</Badge>
          <div>{good}</div>
        </Card>
        <Card className="flex flex-col gap-3 p-4">
          <Badge tone="destructive" className="self-start">Don&apos;t</Badge>
          <div>{bad}</div>
        </Card>
      </div>
    </div>
  );
}

function Examples() {
  return (
    <Section
      id="examples"
      title="Do and don't"
      meta="The mistakes agents make most"
    >
      <div className="flex flex-col gap-8">
        <Pair
          title="One strongest line"
          rule="Basics 5, 6, 8, 9"
          good={
            <div>
              <PropertyRow
                label="Website domain"
                value="fullspecstaff.com"
                help="The website typed or confirmed"
                meta="domain"
              />
              <PropertyRow
                label="Name searched"
                value="Full Spectrum Search Group"
                help="Confirmed name, else the site's own title"
                meta="brand_name"
              />
            </div>
          }
          bad={<BadProvisionRows />}
        />
        <Pair
          title="Two text colours"
          rule="Basic 3"
          good={
            <div className="flex flex-col">
              <span className="type-title text-foreground">
                Quarterly report
              </span>
              <span className="type-meta text-muted-foreground">
                PDF · 2.4 MB · edited 2 min ago
              </span>
            </div>
          }
          bad={<BadGreys />}
        />
        <Pair
          title="Colour has meaning"
          rule="Basic 4"
          good={
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="success">Complete</Badge>
              <Badge tone="info">Running</Badge>
              <Badge tone="warning">Needs review</Badge>
              <Badge tone="destructive">Failed</Badge>
            </div>
          }
          bad={<BadColours />}
        />
        <Pair
          title="One surface level"
          rule="Basic 10"
          good={
            <div className="flex flex-col gap-1">
              <Tile
                layout="row"
                variant="quiet"
                icon={<FileText />}
                title="Brand brief"
                line="Edited today"
              />
              <Tile
                layout="row"
                variant="quiet"
                icon={<FileText />}
                title="Launch plan"
                line="Edited yesterday"
              />
            </div>
          }
          bad={<BadSurfaces />}
        />
        <Pair
          title="Every state is designed"
          rule="Basic 11"
          good={
            <div>
              <PropertyRow label="Name confirmed by the person" missing />
              <PropertyRow
                label="What the social accounts said"
                missing="Not found yet"
              />
            </div>
          }
          bad={<BadStates />}
        />
        <Pair
          title="No prose on screen"
          rule="Basic 12"
          good={
            <EmptyState
              icon={<Inbox />}
              title="No sources yet"
              line="Add a website or a profile to start"
              action={<Button icon={<Plus />}>Add source</Button>}
            />
          }
          bad={<BadProse />}
        />
      </div>
    </Section>
  );
}

// ── 3. Text styles ───────────────────────────────────────────────────────────────────────
function TypeStyles() {
  return (
    <Section id="type" title="Text styles" meta="Six styles, no sizes">
      <Card className="divide-y divide-border">
        {TYPE_STYLES.map((t) => (
          <div
            key={t.cls}
            className="grid items-baseline gap-x-6 gap-y-1 px-4 py-3 md:grid-cols-[9rem_6rem_minmax(0,1fr)]"
          >
            <code className="type-meta font-mono text-muted-foreground">
              {t.cls}
            </code>
            <span className="type-meta text-muted-foreground tabular-nums">
              {t.spec}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span
                className={
                  t.cls === "type-label" || t.cls === "type-value"
                    ? t.cls
                    : `${t.cls} text-foreground`
                }
              >
                {t.sample}
              </span>
              <span className="type-meta text-muted-foreground">{t.use}</span>
            </div>
          </div>
        ))}
      </Card>
    </Section>
  );
}

// ── 4. Colour ────────────────────────────────────────────────────────────────────────────
function Colour() {
  return (
    <Section id="colour" title="Colour" meta="Tokens only — dark mode is free">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SWATCHES.map((s) => (
          <div key={s.token} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="size-9 shrink-0 rounded-md border border-border"
              style={{ background: `hsl(var(--${s.token}))` }}
            />
            <div className="flex min-w-0 flex-col">
              <code className="type-meta truncate font-mono text-foreground">
                {s.token}
              </code>
              <span className="type-meta text-muted-foreground">{s.use}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <span className="type-label">Status — Badge</span>
        <div className="flex flex-wrap gap-1.5">
          {BADGE_TONES.map((t) => (
            <Badge key={t} tone={t}>
              {t}
            </Badge>
          ))}
        </div>
        <span className="type-label">Names a kind — Chip tones</span>
        <ChipSet>
          {CHIP_TONES.map((t) => (
            <Chip key={t} label={t} tone={t} />
          ))}
        </ChipSet>
      </div>
    </Section>
  );
}

// ── 5. Spacing ───────────────────────────────────────────────────────────────────────────
function Spacing() {
  return (
    <Section id="spacing" title="Spacing" meta="The 4px grid">
      <div className="flex flex-col gap-2">
        {SPACING.map((s) => (
          <div
            key={s.cls}
            className="grid grid-cols-[4rem_3rem_minmax(0,1fr)] items-center gap-3"
          >
            <code className="type-meta font-mono text-muted-foreground">
              {s.cls}
            </code>
            <span className="type-meta text-muted-foreground tabular-nums">
              {s.px}px
            </span>
            <span
              aria-hidden="true"
              className="h-3 rounded-sm bg-primary"
              style={{ width: s.px * 4 }}
            />
          </div>
        ))}
      </div>
      <span className="type-secondary text-muted-foreground">
        Components space themselves — add gaps only between them
      </span>
    </Section>
  );
}

// ── 6. Components ────────────────────────────────────────────────────────────────────────
function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="grid items-center gap-x-6 gap-y-2 px-4 py-4 md:grid-cols-[9rem_minmax(0,1fr)]">
      <code className="type-meta font-mono text-muted-foreground">{name}</code>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Components() {
  const [view, setView] = useState<"all" | "mine" | "shared">("all");
  const [tab, setTab] = useState<"overview" | "sources" | "history">(
    "overview",
  );
  const [sort, setSort] = useState("recent");
  const [notify, setNotify] = useState(true);
  const [open, setOpen] = useState(true);
  return (
    <Section
      id="components"
      title="Components"
      meta="@ai-matrx/design-system/controls"
    >
      <Card className="divide-y divide-border">
        <Row name="Button">
          <ControlRow>
            <Button variant="primary" icon={<Plus />}>
              New brand
            </Button>
            <Button variant="outline" icon={<Download />}>
              Export
            </Button>
            <Button variant="quiet">Cancel</Button>
            <Button variant="danger">Delete</Button>
            <Button
              variant="quiet"
              icon={<Bell />}
              aria-label="Notifications"
            />
          </ControlRow>
        </Row>
        <Row name="Field · SearchField">
          <ControlRow>
            <Field placeholder="Brand name" width="md" />
            <SearchField placeholder="Search brands" width="md" />
          </ControlRow>
        </Row>
        <Row name="Select · Switch">
          <ControlRow>
            <Select
              aria-label="Sort"
              value={sort}
              onValueChange={setSort}
              options={[
                { value: "recent", label: "Most recent" },
                { value: "name", label: "Name" },
                { value: "size", label: "Size" },
              ]}
            />
            <Switch
              checked={notify}
              onCheckedChange={setNotify}
              aria-label="Notify me"
            />
          </ControlRow>
        </Row>
        <Row name="SegmentedControl">
          <SegmentedControl
            aria-label="Who"
            value={view}
            onValueChange={setView}
            data={[
              { value: "all", label: "All", count: 42 },
              { value: "mine", label: "Mine", count: 12 },
              { value: "shared", label: "Shared" },
            ]}
          />
        </Row>
        <Row name="Tabs">
          <Tabs
            aria-label="Sections"
            value={tab}
            onValueChange={setTab}
            data={[
              { value: "overview", label: "Overview" },
              { value: "sources", label: "Sources", count: 17 },
              { value: "history", label: "History" },
            ]}
          />
        </Row>
        <Row name="Tile">
          <div className="grid gap-2 sm:grid-cols-2">
            <Tile
              layout="row"
              variant="outline"
              icon={<Globe />}
              title="Website"
              line="fullspecstaff.com"
              selected
            />
            <Tile
              layout="row"
              variant="outline"
              icon={<Search />}
              title="Web search"
              line="58 results read"
            />
          </div>
        </Row>
        <Row name="DisclosureHeader">
          <DisclosureHeader
            open={open}
            onClick={() => setOpen((o) => !o)}
            title="Advanced"
            meta="4 settings"
          />
        </Row>
        <Row name="RowGroup · SettingRow">
          <RowGroup title="Notifications">
            <SettingRow
              label="Email me when a run finishes"
              line="Only runs you started"
            >
              <Switch
                checked={notify}
                onCheckedChange={setNotify}
                aria-label="Email me when a run finishes"
              />
            </SettingRow>
          </RowGroup>
        </Row>
        <Row name="IndicatorStrip">
          <IndicatorStrip
            items={[
              {
                id: "premium",
                icon: Crown,
                label: "Premium model",
                on: true,
                tone: "warning",
              },
              {
                id: "fast",
                icon: Zap,
                label: "Fast",
                on: true,
                tone: "success",
              },
              { id: "private", icon: Lock, label: "Private", on: false },
            ]}
          />
        </Row>
        <Row name="DeleteButton">
          <DeleteButton aria-label="Delete brand" />
        </Row>
      </Card>
    </Section>
  );
}

// ── 7. Reading data ──────────────────────────────────────────────────────────────────────
function ReadingData() {
  return (
    <Section
      id="data"
      title="Reading data"
      meta="PropertyRow — label over value"
    >
      <Card className="px-4 py-1">
        <PropertyRow
          label="Website domain"
          value="fullspecstaff.com"
          help="The website typed or confirmed"
          meta="domain · 17 chars"
          gutter
        />
        <PropertyRow
          label="Name searched"
          value="Full Spectrum Search Group"
          help="Confirmed name, else the site's own title"
          meta="brand_name"
          gutter
        />
        <PropertyRow
          label="Name confirmed by the person"
          missing
          meta="name_confirmed"
          gutter
        />
        <PropertyRow
          label="Web candidates"
          data={WEB_CANDIDATES}
          help="Profiles and listings, with certainty"
          meta="web_candidates · 3 items"
          expanded={<JsonInspector data={WEB_CANDIDATES} />}
        />
        <PropertyRow
          label="Run id"
          value="167f877f-2a41-4c1e-9d0b-5e8a3c2f1b90"
          mono
          meta="run_id"
          gutter
        />
      </Card>
    </Section>
  );
}

// ── 8. States ────────────────────────────────────────────────────────────────────────────
function States() {
  return (
    <Section id="states" title="States" meta="Never blank, never grey italics">
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="px-4 py-1">
          <PropertyRow label="Name confirmed by the person" missing />
          <PropertyRow label="Phone" missing="Not set" />
          <PropertyRow label="Founded" missing="Unknown" />
        </Card>
        <Card className="flex flex-col gap-2 p-4">
          <span className="type-label">Loading</span>
          <RegionSkeleton shape="rows" count={3} aria-label="Loading sources" />
        </Card>
        <Card className="p-4">
          <EmptyState
            icon={<Inbox />}
            title="No sources yet"
            line="Add a website or a profile to start"
            action={<Button icon={<Plus />}>Add source</Button>}
          />
        </Card>
        <Card className="p-4">
          <EmptyState
            icon={<AlertTriangle />}
            title="Couldn't load sources"
            line="The server didn't answer in time"
            action={<Button variant="outline">Try again</Button>}
          />
        </Card>
      </div>
    </Section>
  );
}
