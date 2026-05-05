import { cn } from "@/styles/themes/utils";

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export function UnreadBadge({ count, className }: UnreadBadgeProps) {
  if (!count || count <= 0) return null;
  const display = count > 999 ? "999+" : String(count);
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold leading-none text-white",
        className,
      )}
    >
      {display}
    </span>
  );
}
