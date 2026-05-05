import { formatDistanceToNowStrict } from "date-fns";

interface PresenceLabelProps {
  online?: boolean;
  lastSeenAt?: string | null;
  typingText?: string;
}

export function PresenceLabel({
  online,
  lastSeenAt,
  typingText,
}: PresenceLabelProps) {
  if (typingText) {
    return (
      <span className="text-emerald-600 dark:text-emerald-400">
        {typingText}
      </span>
    );
  }
  if (online) {
    return <span className="text-muted-foreground">online</span>;
  }
  if (lastSeenAt) {
    try {
      const rel = formatDistanceToNowStrict(new Date(lastSeenAt), {
        addSuffix: true,
      });
      return (
        <span className="text-muted-foreground">last seen {rel}</span>
      );
    } catch {
      return null;
    }
  }
  return null;
}
