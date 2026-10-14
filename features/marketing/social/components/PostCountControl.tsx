"use client";

/**
 * "How many posts" beside the thing that fetches: the remembered choice + the live estimate in
 * points. One control, every account-fetch surface.
 */

import Link from "next/link";
import { Badge, Select, type SelectOption } from "@ai-matrx/design-system/controls";

import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { useQuery } from "@tanstack/react-query";
import { getCosts } from "../server";
import { formatPointsAlways } from "../cost";
import {
  choiceLabel,
  choiceMenu,
  postCountReason,
  postsUsd,
  SOCIAL_LIMITS_HREF,
  POST_COUNT_PERSON_HREF,
  resolveCount,
  usePostCount,
  useProfilePostsMax,
  type PostCountChoice,
} from "../post-count";

/** The count the current choice means, and the words for its cost. */
export function usePostCountEstimate(organizationId: string, platform: string | null | undefined, countOverride?: number) {
  const { choice } = usePostCount();
  const max = useProfilePostsMax();
  const { toPoints } = useCostDisplay();
  const costs = useQuery({
    queryKey: ["marketing", "social", "costs", organizationId],
    queryFn: ({ signal }) => getCosts({ organizationId, signal }),
    enabled: Boolean(organizationId),
    staleTime: 60 * 60 * 1000,
  });
  const count = countOverride ?? resolveCount(choice, max.value);
  const estimate = formatPointsAlways(postsUsd(costs.data, platform, count), toPoints);
  return { choice, count, estimate, maxError: max.error && choice === "all", max: max.value };
}

export function PostCountControl({
  organizationId,
  platform,
  disabled,
}: {
  organizationId: string;
  platform?: string | null;
  disabled?: boolean;
}) {
  const { choice, setChoice } = usePostCount();
  const { estimate, count, maxError, max } = usePostCountEstimate(organizationId, platform);
  const reason = postCountReason(count, choice, max);
  const effective = reason.limited && max != null ? max : count;
  const options: SelectOption<PostCountChoice>[] = choiceMenu(choice).map((c) => ({ value: c, label: choiceLabel(c) }));
  const settingsHref = reason.limited ? SOCIAL_LIMITS_HREF(organizationId, "profile_posts_max") : POST_COUNT_PERSON_HREF;
  return (
    <span className="inline-flex items-center gap-2" data-testid="post-count-control">
      <Select aria-label="How many posts" value={choice ?? ""} options={options} onValueChange={setChoice} disabled={disabled || choice === null} />
      <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
        {maxError ? "Limit not loaded" : estimate ?? ""}
      </span>
      {/* Only when a limit actually applies: say so, and link to the setting that set it. */}
      {reason.limited && effective != null ? (
        <Link href={settingsHref} title={reason.text} className="inline-flex">
          <Badge tone="warning">{`Org max ${effective.toLocaleString("en-US")}`}</Badge>
        </Link>
      ) : null}
    </span>
  );
}
