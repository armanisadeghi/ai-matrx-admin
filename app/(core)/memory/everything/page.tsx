// /memory/everything — placeholder (registered promise memory.everything). Drive's all-files
// view and the knowledge hub are the closest built things.
import { FolderOpen, Image, Search, Share2, Star, Trash2 } from "lucide-react";
import { ModulePromiseSurface } from "@/features/auth/components/module-landing/ModulePromiseSurface";

export default function MemoryEverythingPage() {
  return (
    <ModulePromiseSurface
      title="Everything"
      icon={FolderOpen}
      promiseKey="memory.everything"
      doorsHeading="Works today"
      parent={{ label: "Memory", href: "/memory" }}
      doors={[
        { href: "/files/all", label: "All files", hint: "Everything in your Drive", icon: FolderOpen },
        { href: "/knowledge/hub", label: "Knowledge hub", hint: "Search and sort everything you keep", icon: Search },
        { href: "/files/starred", label: "Starred", hint: "Files you starred", icon: Star },
        { href: "/files/shared", label: "Shared with you", hint: "Files others shared with you", icon: Share2 },
        { href: "/files/photos", label: "Photos", hint: "Your photos and images", icon: Image },
        { href: "/memory/trash", label: "Trash", hint: "Deleted sources you can restore", icon: Trash2 },
      ]}
    />
  );
}
