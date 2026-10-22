"use client";

/** "How many posts" beside the thing that fetches: the remembered choice. One control, every account-fetch surface. */

import Link from "@/components/navigation/AppLink";
import { Badge, Select, type SelectOption } from "@ai-matrx/design-system/controls";

import {
  choiceLabel,
  choiceMenu,
  postCountReason,
  SOCIAL_LIMITS_HREF,
  POST_COUNT_PERSON_HREF,
  resolveCount,
  usePostCount,
  useProfilePostsMax,
  type PostCountChoice,
} from "../post-count";

/** The count the current choice means. */
export function usePostCountChoice(countOverride?: number) {
  const { choice } = usePostCount();
  const max = useProfilePostsMax();
  const count = countOverride ?? resolveCount(choice, max.value);
  return { choice, count, maxError: max.error && choice === "all", max: max.value };
}

export function PostCountControl({
  organizationId,
  disabled,
}: {
  organizationId: string;
  platform?: string | null;
  disabled?: boolean;
}) {
  const { choice, setChoice } = usePostCount();
  const { count, maxError, max } = usePostCountChoice();
  const reason = postCountReason(count, choice, max);
  const effective = reason.limited && max != null ? max : count;
  const options: SelectOption<PostCountChoice>[] = choiceMenu(choice).map((c) => ({ value: c, label: choiceLabel(c) }));
  const settingsHref = reason.limited ? SOCIAL_LIMITS_HREF(organizationId, "profile_posts_max") : POST_COUNT_PERSON_HREF;
  return (
    <span className="inline-flex items-center gap-2" data-testid="post-count-control">
      <Select aria-label="How many posts" value={choice ?? ""} options={options} onValueChange={setChoice} disabled={disabled || choice === null} />
      {maxError ? (
        <span className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          Limit not loaded
        </span>
      ) : null}
      {/* Only when a limit actually applies: say so, and link to the setting that set it. */}
      {reason.limited && effective != null ? (
        <Link href={settingsHref} title={reason.text} className="inline-flex">
          <Badge tone="warning">{`Org max ${effective.toLocaleString("en-US")}`}</Badge>
        </Link>
      ) : null}
    </span>
  );
}
