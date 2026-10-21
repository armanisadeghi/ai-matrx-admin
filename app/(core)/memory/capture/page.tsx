// /memory/capture — placeholder (registered promise memory.capture): one door to every way
// something enters Memory today.
import { Aperture, Cable, FileInput, Globe, Inbox, Library, Mic, Upload } from "lucide-react";
import { ModulePromiseSurface } from "@/features/auth/components/module-landing/ModulePromiseSurface";

export default function MemoryCapturePage() {
  return (
    <ModulePromiseSurface
      title="Capture"
      icon={Inbox}
      promiseKey="memory.capture"
      doorsHeading="Works today"
      parent={{ label: "Memory", href: "/memory" }}
      doors={[
        { href: "/files/all", label: "Upload files", hint: "Add files to your Drive", icon: Upload },
        { href: "/connected-sources", label: "Connected apps", hint: "Google Drive, Notion, Office and more", icon: Cable },
        { href: "/scraper", label: "Web scraper", hint: "Save a web page or a whole site", icon: Globe },
        { href: "/camera", label: "Camera", hint: "Take a photo or scan a page", icon: Aperture },
        { href: "/transcripts/scribe", label: "Scribe", hint: "Record and transcribe a meeting", icon: Mic },
        { href: "/files/requests", label: "File requests", hint: "Ask someone to send you files", icon: Inbox },
        { href: "/import/ai-chats", label: "Import AI chats", hint: "Bring in ChatGPT, Claude or Gemini history", icon: FileInput },
        { href: "/data/library", label: "Data library", hint: "Public data sources to pull in", icon: Library },
      ]}
    />
  );
}
