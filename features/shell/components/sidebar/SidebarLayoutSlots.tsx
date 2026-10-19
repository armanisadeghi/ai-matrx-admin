"use client";

// The Sidebar's two reserved places for custom layouts (custom-experience PLAN §5.5):
//   • WhatsNewSlot — at the top: one quiet row per destination added to our menus since the person's layout
//     was last reviewed ("New: X" — Add / Dismiss), and "Your organization updated its menu" (Review /
//     Dismiss) when the organization's layout moved since she last looked. Only for a person with her own
//     custom Sidebar; never a modal, never injected into her tree.
//   • EditSidebarRow — at the bottom of the menu: "Edit sidebar…".
import { useState } from "react";
import { PanelLeft, X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdmin } from "@/lib/redux/selectors/userSelectors";
import type { RootState } from "@/lib/redux/rootReducer";
import { useOpenShellLayoutEditor } from "@/features/overlays/definitions/shellLayoutEditorWindow.overlay";
import { useResolvedShellLayout } from "@/features/shell/shell-layout/useResolvedShellLayout";
import { initialShellLayoutState } from "@/features/shell/shell-layout/shellLayoutSlice";
import { parseShellLayoutBody } from "@/features/shell/shell-layout/validate";
import { acceptNew, dismissNew } from "@/features/shell/shell-layout/editor/regions";
import { ShellLayoutMount } from "@/features/shell/shell-layout/editor/ShellLayoutMount";
import { useShellLayoutStore } from "@/features/shell/shell-layout/useShellLayoutStore";
import ShellIcon from "../ShellIcon";

const selectHeld = (state: RootState) => state.shellLayout ?? initialShellLayoutState;
const SEEN_KEY = (organizationId: string) => `matrx:shell:org-layout-seen:${organizationId}`;

export function EditSidebarRow() {
  const open = useOpenShellLayoutEditor();
  return (
    <button type="button" title="Edit sidebar" className="shell-nav-item shell-tactile-subtle" onClick={() => open({ region: "sidebar" })} data-shell-edit-sidebar>
      <span className="shell-nav-icon text-muted-foreground">
        <PanelLeft size={18} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="shell-nav-label text-muted-foreground">Edit sidebar…</span>
    </button>
  );
}

export function WhatsNewSlot() {
  const layout = useResolvedShellLayout();
  const held = useAppSelector(selectHeld);
  const ownSidebar = layout.source === "person" && held.person ? parseShellLayoutBody(held.person.body).body?.sidebar !== undefined : false;
  const org = held.organizationId ? held.organizations[held.organizationId] : undefined;
  const orgMoved = useOrgMoved(layout.source === "person" ? org : undefined);
  const news = ownSidebar ? layout.whatsNew : [];
  if (news.length === 0 && !orgMoved.moved) return null;
  return (
    <div className="flex flex-col" data-shell-whats-new>
      {news.length > 0 ? (
        <ShellLayoutMount>
          <NewOffers ids={news.map((n) => n.id)} labels={Object.fromEntries(news.map((n) => [n.id, n.label]))} icons={Object.fromEntries(news.map((n) => [n.id, n.iconName]))} />
        </ShellLayoutMount>
      ) : null}
      {orgMoved.moved ? <OrgUpdatedOffer onDismiss={orgMoved.dismiss} /> : null}
    </div>
  );
}

/** The organization's layout moved since this person last saw it (first sight only records the version). */
function useOrgMoved(org: { organizationId: string; version: number } | undefined) {
  const [, force] = useState(0);
  if (!org || typeof window === "undefined") return { moved: false, dismiss: () => {} };
  const key = SEEN_KEY(org.organizationId);
  const seen = window.localStorage.getItem(key);
  if (seen === null) {
    window.localStorage.setItem(key, String(org.version));
    return { moved: false, dismiss: () => {} };
  }
  return {
    moved: Number(seen) < org.version,
    dismiss: () => {
      window.localStorage.setItem(key, String(org.version));
      force((n) => n + 1);
    },
  };
}

function OfferRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-1 rounded-md px-1" title={label}>
      <span className="shell-nav-icon text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 truncate type-secondary text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function NewOffers({ ids, labels, icons }: { ids: string[]; labels: Record<string, string>; icons: Record<string, Parameters<typeof ShellIcon>[0]["name"]> }) {
  const store = useShellLayoutStore();
  const isAdmin = useAppSelector(selectIsAdmin);
  const body = store.person ? parseShellLayoutBody(store.person.body).body : null;
  if (!body) return null;
  const write = async (next: typeof body, note: string) => {
    const answer = await store.save("person", next, note);
    if (!answer.ok) toast.error(answer.error);
  };
  return (
    <>
      {ids.map((id) => (
        <OfferRow key={id} icon={<ShellIcon name={icons[id] ?? "Plus"} size={16} strokeWidth={1.75} />} label={`New: ${labels[id]}`}>
          <Button variant="quiet" disabled={store.saving} onClick={() => void write(acceptNew(body, id, ids, { isAdmin }), `Added ${labels[id]}`)}>
            Add
          </Button>
          <Button variant="quiet" aria-label={`Dismiss ${labels[id]}`} icon={<X />} disabled={store.saving} onClick={() => void write(dismissNew(body, id), `Dismissed ${labels[id]}`)} />
        </OfferRow>
      ))}
    </>
  );
}

function OrgUpdatedOffer({ onDismiss }: { onDismiss: () => void }) {
  const open = useOpenShellLayoutEditor();
  return (
    <OfferRow icon={<PanelLeft size={16} strokeWidth={1.75} />} label="Your organization updated its menu">
      <Button
        variant="quiet"
        onClick={() => {
          onDismiss();
          open({ region: "sidebar" });
        }}
      >
        Review
      </Button>
      <Button variant="quiet" aria-label="Dismiss" icon={<X />} onClick={onDismiss} />
    </OfferRow>
  );
}
