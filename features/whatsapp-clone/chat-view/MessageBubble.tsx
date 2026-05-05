import { TextBubble } from "./bubbles/TextBubble";
import { ImageBubble } from "./bubbles/ImageBubble";
import { VideoBubble } from "./bubbles/VideoBubble";
import { AudioBubble } from "./bubbles/AudioBubble";
import { FileBubble } from "./bubbles/FileBubble";
import { SystemBubble } from "./bubbles/SystemBubble";
import type { WAMessage } from "../types";

interface MessageBubbleProps {
  message: WAMessage;
  senderName?: string;
}

export function MessageBubble({ message, senderName }: MessageBubbleProps) {
  switch (message.type) {
    case "text":
      return <TextBubble message={message} />;
    case "image":
      return <ImageBubble message={message} />;
    case "video":
      return <VideoBubble message={message} />;
    case "audio":
      return <AudioBubble message={message} senderName={senderName} />;
    case "file":
      return <FileBubble message={message} />;
    case "system":
      return <SystemBubble message={message} />;
    default:
      return null;
  }
}
