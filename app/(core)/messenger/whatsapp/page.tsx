import RouteHeader from "@/features/shell/components/header/RouteHeader";
import PageHeader from "@/features/shell/components/header/PageHeader";
import { PersonalWhatsAppPanel } from "@/features/social-connections/PersonalWhatsAppPanel";

export default function PersonalWhatsAppPage() {
  return <><PageHeader><RouteHeader left={<h1 className="truncate px-1.5 text-sm font-medium">WhatsApp</h1>} /></PageHeader>
    <div className="h-full min-h-0 overflow-hidden pt-[var(--shell-header-h)]"><PersonalWhatsAppPanel messenger /></div></>;
}
