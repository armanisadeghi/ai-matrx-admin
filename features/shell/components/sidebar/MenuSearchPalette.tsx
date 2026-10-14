"use client";

// MenuSearchPalette — the "Search menu" command palette (Linear / Stripe
// pattern): one ranked list of every place the menus can take you, each row
// with its breadcrumb, instead of a filtered copy of the menu tree. Loaded on
// first open by SidebarMenuSearch (one dynamic edge), so none of this — the
// admin catalog included — ships with the shell.
//
// Sources: the viewer's main nav tree + Settings, and for admins the
// Administration cascade (Dashboard, Launchpad, every domain and destination).
// Rows run exactly what the sidebar row would: navigate, open in a new tab,
// open a window panel, or run a create action.

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft } from "lucide-react";
import { IconResolver } from "@ai-matrx/icons";
import { openOutbound } from "@ai-matrx/kit/outbound";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectHasAccount, selectIsAdminPerson } from "@/lib/redux/selectors/userSelectors";
import { crossDeploymentHref } from "@/lib/deployment/surfaces";
import { ADMIN_LAUNCHPAD_PATH } from "@/features/admin/constants/admin-categories";
import { adminDomainHref, adminMenuDomains } from "@/features/admin/constants/admin-navigation";
import {
  navItemsForViewer,
  primaryNavItems,
  settingsItem,
  NAV_WINDOW_PANEL_ICON,
} from "../../constants/nav-data";
import { resolveShellIconName } from "../../shellIconMap";
import { useNavActions } from "../../navigation/navActions";
import { useNavPanelActions } from "../../navigation/navPanelActions";
import {
  buildMenuSearchIndex,
  highlightMenuMatch,
  rankMenuSearch,
  type MenuSearchEntry,
} from "../../utils/menu-search";
import ShellIcon from "../ShellIcon";

const RECENT_KEY = "matrx.shell.menuSearch.recent";
const RECENT_LIMIT = 5;

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function rememberRecent(id: string) {
  try {
    const next = [id, ...readRecent().filter((existing) => existing !== id)].slice(0, RECENT_LIMIT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked (private window): recents are a convenience only.
  }
}

function adminEntries(): MenuSearchEntry[] {
  const admin = ["Administration"];
  const entries: MenuSearchEntry[] = [
    {
      id: "/administration::administration",
      label: "Administration",
      trail: [],
      href: "/administration",
      iconName: "ShieldCheck",
      iconSource: "dynamic",
    },
    {
      id: `${ADMIN_LAUNCHPAD_PATH}::admin launchpad`,
      label: "Admin Launchpad",
      trail: admin,
      href: ADMIN_LAUNCHPAD_PATH,
      iconName: "LayoutGrid",
      iconSource: "dynamic",
      openInNewTab: true,
    },
  ];
  for (const domain of adminMenuDomains) {
    if (domain.slug === "launchpad") continue;
    const href = adminDomainHref(domain);
    entries.push({
      id: `${href}::${domain.name.toLocaleLowerCase()}`,
      label: domain.name,
      trail: admin,
      href,
      iconName: domain.iconName,
      iconSource: "dynamic",
    });
    for (const section of domain.sections) {
      for (const destination of section.destinations) {
        entries.push({
          id: `${destination.link}::${destination.title.toLocaleLowerCase()}`,
          label: destination.title,
          trail: [...admin, domain.name, section.name],
          description: destination.description,
          href: destination.link,
          iconName: destination.iconName,
          iconSource: "dynamic",
        });
      }
    }
  }
  return entries;
}

function EntryIcon({ entry }: { entry: MenuSearchEntry }) {
  if (entry.panelAction) {
    return <ShellIcon name={NAV_WINDOW_PANEL_ICON} size={16} strokeWidth={1.75} />;
  }
  if (entry.iconSource === "dynamic") {
    return <IconResolver iconName={entry.iconName} className="h-4 w-4" />;
  }
  return <ShellIcon name={resolveShellIconName(entry.iconName)} size={16} strokeWidth={1.75} />;
}

function Highlighted({ text, query }: { text: string; query: string }): ReactNode {
  return highlightMenuMatch(text, query).map((run, index) =>
    run.match ? (
      <mark key={index} className="rounded-sm bg-transparent font-semibold text-foreground">
        {run.text}
      </mark>
    ) : (
      <span key={index}>{run.text}</span>
    ),
  );
}

interface MenuSearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
}

export default function MenuSearchPalette({ open, onOpenChange, query, onQueryChange }: MenuSearchPaletteProps) {
  const router = useRouter();
  const navActions = useNavActions();
  const navPanelActions = useNavPanelActions();
  const isAuthenticated = useAppSelector(selectHasAccount);
  const isAdmin = useAppSelector(selectIsAdminPerson);
  const [selected, setSelected] = useState("");
  const [recentIds] = useState(readRecent);
  // ⌘/Ctrl held on Enter or click: open the destination in a new tab.
  const newTabIntent = useRef(false);

  const topLevel = [...navItemsForViewer(primaryNavItems, isAuthenticated), settingsItem];
  const index = buildMenuSearchIndex(topLevel, isAdmin ? adminEntries() : []);
  const byId = new Map(index.map((entry) => [entry.id, entry]));

  const trimmed = query.trim();
  const results = trimmed ? rankMenuSearch(index, trimmed) : [];
  const recent = recentIds.map((id) => byId.get(id)).filter((entry): entry is MenuSearchEntry => Boolean(entry));
  const sections = index.filter((entry) => entry.trail.length === 0);

  const run = (entry: MenuSearchEntry, newTab: boolean) => {
    rememberRecent(entry.id);
    onOpenChange(false);

    const panel = entry.panelAction ? navPanelActions[entry.panelAction] : undefined;
    if (panel) return panel();
    const action = entry.action ? navActions[entry.action] : undefined;
    if (action) return action();

    const crossOrigin = crossDeploymentHref(entry.href);
    if (newTab || entry.external || entry.openInNewTab) {
      openOutbound(crossOrigin ?? entry.href, "_blank", "noopener,noreferrer");
      return;
    }
    if (crossOrigin) {
      window.location.assign(crossOrigin);
      return;
    }
    router.push(entry.href);
  };

  const renderRow = (entry: MenuSearchEntry, groupKey: string) => (
    <CommandItem
      key={`${groupKey}:${entry.id}`}
      value={`${groupKey}:${entry.id}`}
      onPointerDown={(event) => {
        newTabIntent.current = event.metaKey || event.ctrlKey;
      }}
      onSelect={() => run(entry, newTabIntent.current)}
      className="group gap-2.5 !py-2"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
        <EntryIcon entry={entry} />
      </span>
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="shrink-0 truncate text-sm text-foreground/90">
          <Highlighted text={entry.label} query={trimmed} />
        </span>
        {entry.trail.length > 0 ? (
          <span className="min-w-0 truncate type-secondary text-muted-foreground">
            {entry.trail.join(" › ")}
          </span>
        ) : null}
      </span>
      {entry.external || entry.openInNewTab ? (
        <ShellIcon name="ArrowUpRight" size={14} strokeWidth={1.75} className="shrink-0 text-muted-foreground" />
      ) : null}
      <CornerDownLeft
        aria-hidden
        className="!h-3.5 !w-3.5 shrink-0 text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100"
      />
    </CommandItem>
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command
        shouldFilter={false}
        loop
        value={selected}
        onValueChange={setSelected}
        onKeyDown={(event) => {
          if (event.key === "Enter") newTabIntent.current = event.metaKey || event.ctrlKey;
        }}
        className="bg-transparent"
        data-menu-search-palette=""
      >
        <CommandInput
          autoFocus
          value={query}
          onValueChange={(next) => {
            onQueryChange(next);
            setSelected("");
          }}
          placeholder="Search the menu…"
          aria-label="Search the menu"
          className="pr-8"
        />
        <CommandList className="h-[min(60vh,28rem)] max-h-none">
          {trimmed ? (
            <>
              <CommandEmpty>No menu item matches “{trimmed}”.</CommandEmpty>
              {results.length > 0 ? (
                <CommandGroup heading="Menu">{results.map((entry) => renderRow(entry, "hit"))}</CommandGroup>
              ) : null}
            </>
          ) : (
            <>
              {recent.length > 0 ? (
                <CommandGroup heading="Recent">{recent.map((entry) => renderRow(entry, "recent"))}</CommandGroup>
              ) : null}
              <CommandGroup heading="Go to">{sections.map((entry) => renderRow(entry, "section"))}</CommandGroup>
            </>
          )}
        </CommandList>
        <div className="flex items-center gap-3 border-t border-border px-3 py-1.5 type-secondary text-muted-foreground">
          <span><kbd className="font-sans">↑↓</kbd> Move</span>
          <span><kbd className="font-sans">↵</kbd> Open</span>
          <span><kbd className="font-sans">⌘↵</kbd> New tab</span>
          <span className="ml-auto"><kbd className="font-sans">Esc</kbd> Close</span>
        </div>
      </Command>
    </CommandDialog>
  );
}
