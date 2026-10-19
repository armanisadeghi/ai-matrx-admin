"use client";

// features/launchpad/widgets/bodies/LaunchpadLinkWidget.tsx — a door to another of the person's launchpads
// (`/launchpad/<key>`, bookmarkable). Launchpads link to each other the way Notion pages do.
import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { configText, type LaunchpadWidgetBodyProps } from "../types";
import { WidgetNotice } from "../frame";
import { launchpadHref } from "@/features/shell/shell-layout/resolve";

export function LaunchpadLinkWidget({ config, editing }: LaunchpadWidgetBodyProps) {
  const key = configText(config, "key");
  if (!key) return <WidgetNotice>{editing ? "Set up to choose a launchpad" : "No launchpad chosen"}</WidgetNotice>;
  const title = configText(config, "title") || key;
  return (
    <Link
      href={launchpadHref(key)}
      data-clickable
      className="flex h-full items-center gap-3 rounded px-3 hover:bg-muted"
    >
      <Rocket className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-medium" title={title}>
        {title}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
