import type { TopicalMapTopicPanelDefinitionData } from "./topicalMapTopicPanel.overlay";
import { parseTopicPanelInstanceId, topicPanelInstanceId } from "@/features/marketing/seo/topical-map/panel/topicPanelInstance";
import { openOverlay } from "@ai-matrx/summon";
import type { LinkHydrateContext } from "@ai-matrx/summon";

export function hydrate({ dispatch, id, open }: LinkHydrateContext<TopicalMapTopicPanelDefinitionData>) {
    const identity = parseTopicPanelInstanceId(id);
    if (!identity) {
      // Nothing fails silently: half an identity has no topic to show, and an
      // empty frame would be worse than not restoring at all.
      console.warn(
        `[initUrlHydration] Ignoring "?panels=topic:${id}": a topic panel is ` +
          `addressed as "<mapId>|<slug>". Re-copy the link from the panel's ` +
          `own share control.`,
      );
      return;
    }
    dispatch(
      openOverlay({
        overlayId: "topicalMapTopicPanel",
        instanceId: topicPanelInstanceId(identity),
        data: { stackIndex: 0, ...identity, siteId: null },
      }),
    );
}
