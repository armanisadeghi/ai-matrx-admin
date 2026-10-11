"use client";

/**
 * "How many posts" beside the thing that fetches: the remembered choice + the live estimate in
 * points. One control, every account-fetch surface.
 */

import Link from "next/link";
import { Select, type SelectOption } from "@ai-matrx/design-system/controls";

import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { useQuery } from "@tanstack/react-query";
import { getCosts } from "../server";
import { formatPointsAlways } from "../cost";
import {
  choiceLabel,
  choiceMenu,
  countReason,
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
  const reason = countReason(count, choice, max);
  const effective = reason.limited && max != null ? max : count;
  const options: SelectOption<PostCountChoice>[] = choiceMenu(choice).map((c) => ({ value: c, label: choiceLabel(c) }));
  return (
    <span className="inline-flex items-center gap-2" data-testid="post-count-control">
      <Select aria-label="How many posts" value={choice ?? ""} options={options} onValueChange={setChoice} disabled={disabled || choice === null} />
      <span className="min-w-16 text-xs text-muted-foreground" aria-live="polite">
        {maxError ? "Limit not loaded" : effective != null ? `${effective.toLocaleString("en-US")} posts` : ""}
        {estimate ? ` · ${estimate}` : ""}
        {choice !== null && !maxError ? ` · ${reason.text} · ` : null}
        {choice !== null && !maxError ? (
          <Link href={reason.limited ? SOCIAL_LIMITS_HREF(organizationId, "profile_posts_max") : POST_COUNT_PERSON_HREF} className="underline">
            Change
          </Link>
        ) : null}
      </span>
    </span>
  );
}
