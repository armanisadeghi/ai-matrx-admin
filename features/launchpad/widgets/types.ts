// features/launchpad/widgets/types.ts — THE ONE WIDGET REGISTRY's shapes (project custom-experience §5.6).
//
// A launchpad is a `LaunchpadDoc` (features/shell/shell-layout/contract.ts): widgets placed on the
// GridCanvas (12 columns desktop, 4 on a phone). The doc is the only thing saved; every widget reads live
// data at render through its feature's own hook or service. A widget type registers ONCE here and is
// usable on every launchpad (and, as later phases land, on a Board and a Page).
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { BoardSection } from "@/features/board/items/types";

/** The size a widget opens at and the limits the grid keeps it within (12-column grid units). */
export interface LaunchpadWidgetSizes {
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
  maxW?: number;
  maxH?: number;
}

/** One basic config field the Set up panel shows. `options` = a choice; `picker` = live data; neither = text. */
export interface LaunchpadWidgetField {
  key: string;
  label: string;
  options?: readonly { value: string; label: string }[];
  picker?: "dataPage" | "dataTable" | "metricKeys" | "launchpad" | "applet" | "appPage";
}

export interface LaunchpadWidgetBodyProps {
  /** The widget's saved config (text values; a newer widget's lists or objects arrive as-is). */
  config: Readonly<Record<string, unknown>>;
  /** The launchpad is in Edit mode (bodies keep links quiet and show set-up hints). */
  editing: boolean;
  /** How many list rows the widget's height holds (the skeleton draws exactly this many). */
  capacity: number;
}

/**
 * What a widget is, without its body — the catalog an agent, the Add panel and the history notes read.
 * `publishes` is the place for the page bus (a later phase): the values this widget will offer other
 * widgets ("selected file"). Declared now, wired by nobody yet.
 */
export interface LaunchpadWidgetSpec {
  type: string;
  label: string;
  icon: LucideIcon;
  section: BoardSection;
  sizes: LaunchpadWidgetSizes;
  defaultConfig: Readonly<Record<string, string>>;
  fields: readonly LaunchpadWidgetField[];
  /** One line naming this widget with this config ("Recent notes", "Tasks"). */
  describe: (config: Readonly<Record<string, unknown>>) => string;
  /** Where the widget's header title links (its feature's page), or none. */
  href?: (config: Readonly<Record<string, unknown>>) => string | null;
  publishes?: readonly { name: string; label: string }[];
}

export interface LaunchpadWidgetType extends LaunchpadWidgetSpec {
  Body: ComponentType<LaunchpadWidgetBodyProps>;
}

/** A config value as text ("" when absent or not text). */
export function configText(config: Readonly<Record<string, unknown>>, key: string): string {
  const v = config[key];
  return typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : "";
}
