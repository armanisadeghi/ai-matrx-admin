"use client";

// WhatsNewOffers — THE What's new offers, drawn in either place they live (custom-experience PLAN §5.5):
// `placement="sidebar"` (WhatsNewSlot, the top of the Sidebar) and `placement="band"` (the top of every
// launchpad). ONE list (`useShellLayoutOffers`), ONE set of actions (the person's layout through the save
// lane): "New: X" — Add / Dismiss, and "Your organization updated its menu" — Review / Dismiss. Review opens
// what the organization's menu has that hers lacks, with Add per row and "Use the organization's menu".
// Nothing to offer → nothing rendered (and the held layouts are server-seeded, so the first frame already
// knows). Never a modal on its own, never injected into her menu.
import { useState } from "react";
import { PanelLeft, X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdmin } from "@/lib/redux/selectors/userSelectors";
import type { RootState } from "@/lib/redux/rootReducer";
import { cn } from "@/lib/utils";
import ShellIcon from "@/features/shell/components/ShellIcon";
import type { ShellLayoutBody } from "../contract";
import { initialShellLayoutState } from "../shellLayoutSlice";
import { useShellLayoutOffers } from "../useResolvedShellLayout";
import { addOrgRow, markOrgReviewed, orgMenuAdditions, takeOrganizationSidebar, type OrgMenuUpdate } from "../offers";
import { parseShellLayoutBody } from "../validate";
import { acceptNew, dismissNew, startingBody } from "./regions";
import { ShellLayoutMount } from "./ShellLayoutMount";
import { useShellLayoutStore } from "../useShellLayoutStore";

export type WhatsNewPlacement = "sidebar" | "band";

export function WhatsNewOffers({ placement }: { placement: WhatsNewPlacement }) {
  const offers = useShellLayoutOffers();
  // The review stays open after its own Add (which can end the offer) until she closes it.
  const [review, setReview] = useState<ReviewTarget | null>(null);
  const hasOffers = offers.news.length > 0 || offers.orgUpdate !== null;
  if (!hasOffers && !review) return null;
  const band = placement === "band";
  return (
    <ShellLayoutMount>
      {hasOffers ? (
        <div
          className={cn("flex flex-col", band && "mb-3 rounded-lg border border-border bg-card px-2 py-1 sm:flex-row sm:flex-wrap sm:gap-x-4")}
          data-shell-whats-new={placement}
          role="region"
          aria-label="What's new"
        >
          <Offers
            news={offers.news.map((n) => ({ id: n.id, label: n.label, icon: n.iconName }))}
            orgUpdate={offers.orgUpdate}
            band={band}
            onReview={(target) => setReview(target)}
          />
        </div>
      ) : null}
      {review ? <OrgMenuReview target={review} onClose={() => setReview(null)} /> : null}
    </ShellLayoutMount>
  );
}

type ReviewTarget = { organizationId: string; version: number };
type NewOffer = { id: string; label: string; icon: Parameters<typeof ShellIcon>[0]["name"] };

function OfferRow({ icon, label, band, children }: { icon: React.ReactNode; label: string; band: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-h-9 items-center gap-1 rounded-md px-1", band && "min-w-0 sm:max-w-md")} title={label}>
      <span className="shell-nav-icon text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1 truncate type-secondary text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** Saves her layout through the save lane: each change reads the layout as it stands when its turn comes. */
function usePersonWrite() {
  const store = useShellLayoutStore();
  const write = async (change: (body: ShellLayoutBody) => ShellLayoutBody, note: string) => {
    const answer = await store.save("person", (now) => change(now ?? startingBody(null, null, "person")), note);
    if (!answer.ok) toast.error(answer.error);
    return answer.ok;
  };
  return { write, saving: store.saving, person: store.person };
}

function Offers({ news, orgUpdate, band, onReview }: { news: NewOffer[]; orgUpdate: OrgMenuUpdate | null; band: boolean; onReview: (target: ReviewTarget) => void }) {
  const { write, saving } = usePersonWrite();
  const isAdmin = useAppSelector(selectIsAdmin);
  const ids = news.map((n) => n.id);
  return (
    <>
      {news.map((n) => (
        <OfferRow key={n.id} band={band} icon={<ShellIcon name={n.icon ?? "Plus"} size={16} strokeWidth={1.75} />} label={`New: ${n.label}`}>
          <Button variant="quiet" disabled={saving} onClick={() => void write((b) => acceptNew(b, n.id, ids, { isAdmin }), `Added ${n.label}`)}>
            Add
          </Button>
          <Button variant="quiet" aria-label={`Dismiss ${n.label}`} icon={<X />} disabled={saving} onClick={() => void write((b) => dismissNew(b, n.id), `Dismissed ${n.label}`)} />
        </OfferRow>
      ))}
      {orgUpdate ? (
        <OfferRow band={band} icon={<PanelLeft size={16} strokeWidth={1.75} />} label="Your organization updated its menu">
          <Button variant="quiet" onClick={() => onReview({ organizationId: orgUpdate.organizationId, version: orgUpdate.version })}>
            Review
          </Button>
          <Button
            variant="quiet"
            aria-label="Dismiss"
            icon={<X />}
            disabled={saving}
            onClick={() => void write((b) => markOrgReviewed(b, orgUpdate.organizationId, orgUpdate.version), "Reviewed the organization's menu")}
          />
        </OfferRow>
      ) : null}
    </>
  );
}

const selectHeldOrganizations = (state: RootState) => (state.shellLayout ?? initialShellLayoutState).organizations;

/** What the organization's menu has that hers lacks: Add per row, or take its menu whole. Closing = reviewed. */
function OrgMenuReview({ target, onClose }: { target: ReviewTarget; onClose: () => void }) {
  const { write, saving, person } = usePersonWrite();
  const isAdmin = useAppSelector(selectIsAdmin);
  const organizations = useAppSelector(selectHeldOrganizations);
  const stored = organizations[target.organizationId];
  const organization = stored ? parseShellLayoutBody(stored.body).body : null;
  const own = person ? parseShellLayoutBody(person.body).body : null;
  const additions = own && organization ? orgMenuAdditions(own, organization, { isAdmin }) : [];
  const finish = (change?: (body: ShellLayoutBody) => ShellLayoutBody, note = "Reviewed the organization's menu") => {
    onClose();
    void write((b) => (change ? change(b) : markOrgReviewed(b, target.organizationId, target.version)), note);
  };
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : finish())}>
      <DialogContent data-shell-org-menu-review>
        <DialogHeader>
          <DialogTitle>Your organization&apos;s menu</DialogTitle>
        </DialogHeader>
        {additions.length === 0 ? (
          <p className="type-secondary text-muted-foreground">Your menu already has everything in it.</p>
        ) : (
          <div className="flex flex-col">
            {additions.map((a) => (
              <OfferRow key={a.node.id} band={false} icon={<ShellIcon name={a.icon} size={16} strokeWidth={1.75} />} label={a.label}>
                <Button variant="quiet" disabled={saving} onClick={() => void write((b) => addOrgRow(b, a.node), `Added ${a.label} from the organization`)}>
                  Add
                </Button>
              </OfferRow>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={saving || !organization}
            onClick={() => organization && finish((b) => takeOrganizationSidebar(b, organization, target.organizationId, target.version), "Used the organization's menu")}
          >
            Use the organization&apos;s menu
          </Button>
          <Button variant="primary" onClick={() => finish()}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
