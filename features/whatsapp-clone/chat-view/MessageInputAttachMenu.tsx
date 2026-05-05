"use client";

import {
  BarChart2,
  Camera,
  FileText,
  Image as ImageIcon,
  Sticker,
  User,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus } from "lucide-react";

const ITEMS: Array<{
  key: string;
  label: string;
  icon: typeof Camera;
  color: string;
}> = [
  { key: "photos", label: "Photos & videos", icon: ImageIcon, color: "#0095f6" },
  { key: "camera", label: "Camera", icon: Camera, color: "#e1338c" },
  { key: "document", label: "Document", icon: FileText, color: "#7f66ff" },
  { key: "sticker", label: "Sticker", icon: Sticker, color: "#06cf9c" },
  { key: "poll", label: "Poll", icon: BarChart2, color: "#f0b232" },
  { key: "contact", label: "Contact", icon: User, color: "#0098fb" },
];

interface MessageInputAttachMenuProps {
  onSelect?: (key: string) => void;
}

export function MessageInputAttachMenu({
  onSelect,
}: MessageInputAttachMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Attach"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#aebac1] transition-colors hover:bg-[#374248] hover:text-white"
        >
          <Plus className="h-6 w-6" strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        className="w-[260px] border-[#2a3942] bg-[#233138] p-1 text-[#e9edef]"
      >
        <div className="flex flex-col">
          {ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect?.(item.key)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-[14px] hover:bg-[#2a3942]"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ backgroundColor: item.color }}
              >
                <item.icon className="h-4 w-4 text-white" strokeWidth={2} />
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
