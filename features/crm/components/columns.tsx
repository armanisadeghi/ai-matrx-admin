// features/crm/components/columns.tsx
//
// The party list's column registry. APP POLICY (features/agents/browse):
// a column either sorts AND filters SERVER-SIDE, or its controls do not
// render at all. Sorting is on the DB column, never the rendered cell —
// which is why Employer (an embed) deliberately declares neither.

import { InfoHint } from "@/components/official/InfoHint";
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  Globe,
  PenLine,
  PhoneOff,
  ShieldCheck,
  User,
} from "lucide-react";
import { Badge, Chip } from "@ai-matrx/design-system/controls";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { formatRelativeTime } from "@/utils/datetime";
import { resolveEntityDoors } from "@/components/official/entity-ref/doors";
import { cn } from "@/lib/utils";
import type { ExpertStatus, PartyListRow } from "../types";
import {
  DATE_BUCKETS,
  EXPERT_STATUSES,
  EXPERT_STATUS_LABEL,
  RECORD_CLASS_FILTERS,
  RECORD_CLASS_FILTER_LABEL,
  WRITTEN_BY_FILTERS,
  WRITTEN_BY_FILTER_LABEL,
} from "../types";
import { AGENT_ICON } from "@/components/icons/domain-icons";

const DATE_BUCKET_OPTIONS = DATE_BUCKETS.map((b) => ({
  value: b.value,
  label: b.label,
}));

/**
 * What the two provenance columns say about one contact, in words a person can
 * act on (DD-131 slice 3).
 *
 * FOUR HONEST STATES, and not one of them is a guess:
 *  - an agent wrote it and nobody has corrected it   → "An agent"
 *  - an agent wrote it and a person has since edited → "Agent, edited"
 *  - machinery discovered it                          → "Found"-adjacent; the
 *    Record column already says that, so this cell stays quiet rather than
 *    saying the same thing twice in two words that do not match
 *  - a person wrote it, or the row predates the columns → the em dash
 *
 * The tooltip carries WHICH agent, because "an agent did it" with no name is
 * the thing the provenance rule exists to forbid.
 */
function writtenByBadge(row: PartyListRow) {
  const tier = row.created_by_tier;
  if (tier !== "agent") {
    return <span className="type-body text-muted-foreground">—</span>;
  }
  const system = row.created_by_system;
  const edited = row.updated_by_tier === "user";
  const who = system ? `Added by ${system}` : "Added by an agent";
  return (
    <Chip
      tone="primary"
      icon={
        edited ? (
          <PenLine aria-hidden />
        ) : (
          <AGENT_ICON aria-hidden />
        )
      }
      label={edited ? "Agent, edited" : "An agent"}
      title={
        edited
          ? `${who}, and a person has edited it since.`
          : `${who}. Nobody has edited it since.`
      }
    />
  );
}

function kindBadge(row: PartyListRow) {
  const isPerson = row.party_kind === "person";
  const Icon = isPerson ? User : Building2;
  return (
    <Chip
      tone={isPerson ? "sky" : "violet"}
      icon={<Icon aria-hidden />}
      label={isPerson ? "Person" : "Company"}
    />
  );
}

function isExpertStatus(value: string | null): value is ExpertStatus {
  return (EXPERT_STATUSES as readonly string[]).includes(value ?? "");
}

/** One renderer for a tier, everywhere — never a second hand-rolled pill. */
export function expertBadge(status: ExpertStatus) {
  const Icon = status === "registered" ? BadgeCheck : ShieldCheck;
  return (
    <Chip
      tone={
        status === "vetted"
          ? "success"
          : status === "approved"
            ? "primary"
            : "neutral"
      }
      icon={<Icon aria-hidden />}
      label={EXPERT_STATUS_LABEL[status]}
    />
  );
}

/**
 * Every column the party table can show. `sortable`/`filter` reflect exactly
 * what `fetchPartyPage` can serve — a control the server can't honor must not
 * render (the /transcripts defect this policy exists to kill).
 */
export const PARTY_COLUMNS: MatrxColumnDef<PartyListRow>[] = [
  {
    id: "display_name",
    accessorKey: "display_name",
    header: "Name",
    sortable: true,
    filter: "text",
    // D112: real link on the title cell — keyboard/SR/middle-click reach the
    // record; the whole-row click stays as a mouse convenience.
    href: (row) => resolveEntityDoors("party", row.id).href ?? "",
    cell: (row) => (
      <div className="flex min-w-0 items-center gap-2">
        <span className="type-title truncate text-foreground">
          {row.display_name}
        </span>
        {row.do_not_contact && (
          <Badge
            tone="destructive"
            icon={<PhoneOff aria-hidden />}
            title={row.do_not_contact_reason ?? "Do not contact"}
          >
            DNC
          </Badge>
        )}
        <span aria-hidden="true" className="ml-1 shrink-0 sm:hidden">
          <Badge tone="primary">
            Open
            <ChevronRight className="h-3 w-3" aria-hidden />
          </Badge>
        </span>
      </div>
    ),
  },
  {
    id: "party_kind",
    accessorKey: "party_kind",
    header: "Kind",
    sortable: true,
    filter: "select",
    filterOptions: [
      { value: "person", label: "Person" },
      { value: "organization", label: "Company" },
    ],
    cell: (row) => kindBadge(row),
    width: 110,
  },
  {
    id: "job_title",
    accessorKey: "job_title",
    header: "Title",
    sortable: true,
    filter: "text",
    cell: (row) => (
      <span className="type-body truncate text-muted-foreground">
        {row.job_title ?? "—"}
      </span>
    ),
  },
  {
    // Maintained by crm._affiliation_edge from the primary affiliation — an
    // embed, so it can neither sort nor filter server-side here. No controls.
    id: "employer",
    accessorFn: (row) => row.employer?.display_name ?? "",
    header: "Employer",
    sortable: false,
    filter: false,
    cell: (row) =>
      row.employer ? (
        <span className="type-body inline-flex min-w-0 items-center gap-1.5 text-foreground">
          <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{row.employer.display_name}</span>
        </span>
      ) : (
        <span className="type-body text-muted-foreground">—</span>
      ),
  },
  {
    id: "primary_domain",
    accessorKey: "primary_domain",
    header: "Domain",
    sortable: true,
    filter: "text",
    cell: (row) =>
      row.primary_domain ? (
        <span className="type-body inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <Globe className="h-3 w-3 shrink-0" />
          <span className="truncate">{row.primary_domain}</span>
        </span>
      ) : (
        <span className="type-body text-muted-foreground">—</span>
      ),
  },
  {
    id: "date_of_birth",
    accessorKey: "date_of_birth",
    header: "Born",
    sortable: true,
    filter: "text",
    cell: (row) =>
      row.date_of_birth ? (
        <span className="type-meta whitespace-nowrap tabular-nums text-muted-foreground">
          {row.date_of_birth}
        </span>
      ) : (
        <span className="type-body text-muted-foreground">—</span>
      ),
  },
  {
    id: "tax_id",
    accessorKey: "tax_id",
    header: "Tax ID",
    sortable: true,
    filter: "text",
    cell: (row) =>
      row.tax_id ? (
        <span className="type-meta font-mono text-muted-foreground">
          {row.tax_id}
        </span>
      ) : (
        <span className="type-body text-muted-foreground">—</span>
      ),
  },
  {
    id: "do_not_contact",
    accessorKey: "do_not_contact",
    header: "DNC",
    sortable: true,
    filter: "boolean",
    align: "center",
    width: 70,
    cell: (row) => (
      <span
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full",
          row.do_not_contact ? "bg-destructive" : "bg-muted-foreground/20",
        )}
      />
    ),
  },
  {
    // Nullable by design: most parties are not experts. The filter's "any" /
    // "none" options are the two questions a user actually asks of a nullable
    // tier, and both are real server predicates (`not is null` / `is null`).
    id: "expert_status",
    accessorKey: "expert_status",
    header: "Expert",
    sortable: true,
    filter: "select",
    // "Any expert" / one tier / "Not an expert" are exclusive predicates and
    // the service takes exactly one — appending would make it inert (D218).
    filterSingle: true,
    filterOptions: [
      { value: "any", label: "Any expert" },
      ...EXPERT_STATUSES.map((s) => ({
        value: s,
        label: EXPERT_STATUS_LABEL[s],
      })),
      { value: "none", label: "Not an expert" },
    ],
    width: 110,
    cell: (row) =>
      isExpertStatus(row.expert_status) ? (
        expertBadge(row.expert_status)
      ) : (
        <span className="type-body text-muted-foreground">—</span>
      ),
  },
  {
    // THE VISIBLE HALF of the record-class rule. The list hides
    // platform-discovered records by default; this is where a user says "show
    // me the SEO prospects" or "show me everything". Hidden by default must
    // never mean unreachable.
    id: "record_class",
    accessorKey: "record_class",
    header: (
      <span className="inline-flex items-center gap-1">
        Record
        <InfoHint text="Found means the platform found it; it is not one of your contacts until you say so." label="About Found" />
      </span>
    ),
    label: "Record",
    sortable: false,
    filter: "select",
    // The three options are exclusive VIEWS of the list, not OR-able tags —
    // multi-select made this facet inert (D218).
    filterSingle: true,
    filterOptions: RECORD_CLASS_FILTERS.map((v) => ({
      value: v,
      label: RECORD_CLASS_FILTER_LABEL[v],
    })),
    width: 120,
    cell: (row) =>
      row.record_class === "discovered" ? (
        <Chip label="Found" />
      ) : (
        <span className="type-body text-muted-foreground">—</span>
      ),
  },
  {
    // WHO WROTE IT (DD-131 slice 3, chair 2026-09-13). The SAME grid and the
    // SAME row page get one control for the question "did an agent add this?",
    // never a second list of agent-added contacts sitting beside the real one.
    //
    // The cell reads two columns the DATABASE fills from the declaration made
    // at the write door — a contact cannot claim a person typed it. A NULL tier
    // is a person's row (the documented reading), which is why the overwhelming
    // majority of rows render the quiet em dash rather than a badge: they were
    // written before this platform could tell, and guessing would be worse than
    // the dash.
    id: "written_by",
    accessorKey: "created_by_tier",
    header: "Written by",
    sortable: false,
    filter: "select",
    // Exclusive views of one question, like `record_class` above — multi-select
    // made that facet inert (D218).
    filterSingle: true,
    filterOptions: WRITTEN_BY_FILTERS.map((v) => ({
      value: v,
      label: WRITTEN_BY_FILTER_LABEL[v],
    })),
    width: 130,
    cell: (row) => writtenByBadge(row),
  },
  {
    id: "updated_at",
    accessorKey: "updated_at",
    header: "Updated",
    sortable: true,
    // A date column's finite value set is "how recently", not a timestamp —
    // relative buckets served as `updated_at >= now() - bucket`. Buckets nest
    // (7d ⊂ 30d), so ORing them is meaningless — single-choice (D218).
    filter: "select",
    filterSingle: true,
    filterOptions: DATE_BUCKET_OPTIONS,
    width: 110,
    cell: (row) => (
      <span className="type-meta whitespace-nowrap tabular-nums text-muted-foreground">
        {formatRelativeTime(row.updated_at)}
      </span>
    ),
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: "Created",
    sortable: true,
    filter: "select",
    filterSingle: true,
    filterOptions: DATE_BUCKET_OPTIONS,
    width: 110,
    cell: (row) => (
      <span className="type-meta whitespace-nowrap tabular-nums text-muted-foreground">
        {formatRelativeTime(row.created_at)}
      </span>
    ),
  },
];
