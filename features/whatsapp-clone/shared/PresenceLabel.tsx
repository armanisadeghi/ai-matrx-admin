import { formatDistanceToNowStrict } from "date-fns";

interface PresenceLabelProps {
  online?: boolean;
  lastSeenAt?: string | null;
  typingText?: string;
}

export function PresenceLabel({ online, lastSeenAt, typingText }: PresenceLabelProps) {
  if (typingText) {
    return <span className="text-[#25d366]">{typingText}</span>;
  }
  if (online) {
    return <span className="text-[#a8b3ba]">online</span>;
  }
  if (lastSeenAt) {
    try {
      const rel = formatDistanceToNowStrict(new Date(lastSeenAt), {
        addSuffix: true,
      });
      return <span className="text-[#a8b3ba]">last seen {rel}</span>;
    } catch {
      return null;
    }
  }
  return null;
}
