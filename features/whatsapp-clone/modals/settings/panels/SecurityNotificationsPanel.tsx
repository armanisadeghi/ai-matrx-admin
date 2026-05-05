import {
  CircleDot,
  Lock,
  MessageSquare,
  MapPin,
  Paperclip,
  Phone,
} from "lucide-react";

const ITEMS: Array<{ icon: typeof Lock; label: string }> = [
  { icon: MessageSquare, label: "Text and voice messages" },
  { icon: Phone, label: "Audio and video calls" },
  { icon: Paperclip, label: "Photos, videos and documents" },
  { icon: MapPin, label: "Location sharing" },
  { icon: CircleDot, label: "Status updates" },
];

export function SecurityNotificationsPanel() {
  return (
    <div className="flex flex-col items-center gap-6 pt-2 text-foreground">
      <div className="flex h-32 w-32 items-center justify-center">
        <Lock
          className="h-24 w-24 text-emerald-500"
          strokeWidth={2}
          aria-hidden
        />
      </div>
      <div className="space-y-3 text-left">
        <h3 className="text-[16px] font-semibold">
          Your chats and calls are private
        </h3>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          End-to-end encryption keeps your personal messages and calls between
          you and the people you choose. No one outside of the chat, not even
          AI Matrx, can read, listen to, or share them. This includes your:
        </p>
      </div>

      <ul className="w-full divide-y divide-border">
        {ITEMS.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-3 py-3 text-[14px] text-foreground"
          >
            <item.icon
              className="h-5 w-5 shrink-0 text-muted-foreground"
              strokeWidth={1.75}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
