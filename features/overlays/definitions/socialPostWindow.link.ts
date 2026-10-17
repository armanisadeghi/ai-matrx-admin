import type { SocialPostWindowDefinitionData } from "./socialPostWindow.overlay";
import { postPanelOutOfScope } from "@/features/marketing/social/panelScope";
import { openOverlay } from "@ai-matrx/summon/open";
import type { LinkHydrateContext } from "@ai-matrx/summon/open";

export function hydrate({ dispatch, id, args, open }: LinkHydrateContext<SocialPostWindowDefinitionData>) {
    const organizationId = args.o;
    if (!id || !organizationId) {
      console.warn(
        `[initUrlHydration] Ignoring "?panels=social_post:${id}": a post panel needs its post and organization ("social_post:<postId>:o-<organizationId>"). Re-copy the link from the panel.`,
      );
      return undefined;
    }
    // A post panel scoped to another brand is refused here and its token leaves the address,
    // instead of lingering in the URL as a window that never opens.
    if (typeof window !== "undefined" && postPanelOutOfScope({ brandSeg: args.b, pathname: window.location.pathname })) {
      return "refused";
    }
    dispatch(
      openOverlay({
        overlayId: "socialPostWindow",
        instanceId: id,
        data: { stackIndex: 0, postId: id, organizationId, brandSeg: args.b ?? "", tab: args.t ?? "overview" },
      }),
    );
    return undefined;
}
