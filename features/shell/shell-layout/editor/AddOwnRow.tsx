"use client";

// AddOwnRow — the "Add" menu of the layout editors: a group, a link (any URL), one of your launchpads, and
// on the Header an AI job (a declared job from the catalogue, never a raw agent id). Records come from
// "Record…" (AddRecordRow, the universal record picker) and "Add to my menu" on the record's own page.
import { useState } from "react";
import { FolderPlus, LayoutGrid, Link2, Plus, Zap } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button, Field, Select, SegmentedControl } from "@ai-matrx/design-system/controls";
import type { ShellIconName } from "@/features/shell/shellIconMap";
import { IconPicker } from "./IconPicker";

export type OwnRowKind = "link" | "group" | "launchpad" | "mandate";

export type OwnRowInput =
  | { kind: "group"; label: string; icon: ShellIconName }
  | { kind: "link"; label: string; href: string; icon: ShellIconName; newTab: boolean }
  | { kind: "launchpad"; key: string; label: string; icon: ShellIconName }
  | { kind: "mandate"; label: string; mandateKey: string; icon: ShellIconName };

export interface PickOption {
  value: string;
  label: string;
}

const KIND_LABEL: Record<OwnRowKind, { label: string; icon: React.ReactNode }> = {
  link: { label: "Link", icon: <Link2 className="h-3.5 w-3.5" /> },
  group: { label: "Group", icon: <FolderPlus className="h-3.5 w-3.5" /> },
  launchpad: { label: "Launchpad", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  mandate: { label: "AI job", icon: <Zap className="h-3.5 w-3.5" /> },
};

const DEFAULT_ICON: Record<OwnRowKind, ShellIconName> = { link: "Link2", group: "Folder", launchpad: "LayoutGrid", mandate: "Zap" };

/** An in-app path, or an absolute http(s) URL. */
function cleanHref(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("/")) return value;
  if (/^https?:\/\/[^\s]+$/i.test(value)) return value;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(value)) return `https://${value}`;
  return null;
}

export function AddOwnRow({
  kinds,
  launchpads,
  jobs,
  jobsLoading,
  onAdd,
}: {
  kinds: OwnRowKind[];
  launchpads: PickOption[];
  jobs?: PickOption[];
  jobsLoading?: boolean;
  onAdd: (row: OwnRowInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OwnRowKind>(kinds[0] ?? "link");
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [icon, setIcon] = useState<ShellIconName>(DEFAULT_ICON[kinds[0] ?? "link"]);
  const [pick, setPick] = useState("");

  const reset = (next: OwnRowKind) => {
    setKind(next);
    setIcon(DEFAULT_ICON[next]);
    setPick("");
  };
  const options = kind === "launchpad" ? launchpads : kind === "mandate" ? (jobs ?? []) : [];
  const picked = options.find((o) => o.value === pick);
  const name = label.trim() || picked?.label || "";
  const url = cleanHref(href);
  const ready =
    kind === "group" ? name.length > 0 : kind === "link" ? name.length > 0 && url !== null : picked !== undefined && name.length > 0;

  const add = () => {
    if (!ready) return;
    if (kind === "group") onAdd({ kind, label: name, icon });
    else if (kind === "link" && url) onAdd({ kind, label: name, href: url, icon, newTab: /^https?:/i.test(url) });
    else if (kind === "launchpad" && picked) onAdd({ kind, key: picked.value, label: name, icon });
    else if (kind === "mandate" && picked) onAdd({ kind, mandateKey: picked.value, label: name, icon });
    setLabel("");
    setHref("");
    setPick("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" icon={<Plus />}>
          Add
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2 p-3">
        {kinds.length > 1 ? (
          <SegmentedControl
            aria-label="What to add"
            value={kind}
            onValueChange={reset}
            fill
            data={kinds.map((k) => ({ value: k, label: KIND_LABEL[k].label }))}
          />
        ) : null}
        {kind === "launchpad" || kind === "mandate" ? (
          options.length > 0 ? (
            <Select
              aria-label={kind === "launchpad" ? "Launchpad" : "AI job"}
              value={pick || "none"}
              onValueChange={(v) => setPick(v === "none" ? "" : v)}
              options={[{ value: "none", label: kind === "launchpad" ? "Choose a launchpad" : "Choose a job" }, ...options]}
            />
          ) : (
            <p className="type-secondary text-muted-foreground">
              {kind === "mandate" && jobsLoading ? "Loading jobs…" : kind === "launchpad" ? "You have no launchpads yet" : "No jobs to choose"}
            </p>
          )
        ) : null}
        {kind === "link" ? (
          // ui-exception: a URL is a raw value
          <Field value={href} onChange={(e) => setHref(e.target.value)} placeholder="/tasks or https://…" aria-label="Address" />
        ) : null}
        <div className="flex items-center gap-1">
          <IconPicker value={icon} onChange={setIcon} />
          {/* ui-exception: a menu row's name is a short raw label */}
          <Field
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder={picked?.label ?? "Name"}
            aria-label="Name"
            className="min-w-0 flex-1"
          />
        </div>
        {kind === "link" && href.trim() && !url ? <p className="type-secondary text-destructive">Enter a page like /tasks or a web address</p> : null}
        <div className="flex justify-end">
          <Button variant="primary" disabled={!ready} onClick={add}>
            Add {KIND_LABEL[kind].label.toLowerCase()}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
