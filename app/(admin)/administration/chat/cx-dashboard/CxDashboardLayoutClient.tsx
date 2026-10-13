"use client";

import AppLink from "@/components/navigation/AppLink";
import { usePathname } from "next/navigation";
import { cn } from "@/styles/themes/utils";
import {
  LayoutDashboard,
  MessageSquare,
  Send,
  BarChart3,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { CxDashboardErrorBoundary } from "@/features/cx-dashboard/components/CxDashboardErrorBoundary";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import {
  ADMIN_CX_DASHBOARD_SURFACE_NAME,
  createAdminCxDashboardScope,
} from "@/features/surfaces/manifests/admin-cx-dashboard.manifest";

const BASE_PATH = "/administration/chat/cx-dashboard";

function sectionFromPathname(pathname: string):
  | "overview"
  | "conversations"
  | "conversation_detail"
  | "requests"
  | "request_detail"
  | "usage"
  | "errors" {
  const rest = pathname.slice(BASE_PATH.length).replace(/^\/+/, "");
  if (!rest) return "overview";
  if (rest.startsWith("conversations/")) return "conversation_detail";
  if (rest.startsWith("conversations")) return "conversations";
  if (rest.startsWith("requests/")) return "request_detail";
  if (rest.startsWith("requests")) return "requests";
  if (rest.startsWith("usage")) return "usage";
  if (rest.startsWith("errors")) return "errors";
  return "overview";
}

const NAV_ITEMS = [
  {
    href: "/administration/chat/cx-dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/administration/chat/cx-dashboard/conversations",
    label: "Conversations",
    icon: MessageSquare,
  },
  {
    href: "/administration/chat/cx-dashboard/requests",
    label: "Requests",
    icon: Send,
  },
  {
    href: "/administration/chat/cx-dashboard/usage",
    label: "Usage & Cost",
    icon: BarChart3,
  },
  {
    href: "/administration/chat/cx-dashboard/errors",
    label: "Errors",
    icon: AlertCircle,
  },
];

export function CxDashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const section = sectionFromPathname(pathname);
  const detail =
    section === "conversation_detail"
      ? { parent: NAV_ITEMS[1]!, label: "Conversation" }
      : section === "request_detail"
        ? { parent: NAV_ITEMS[2]!, label: "Request" }
        : null;

  return (
    <SurfaceRuntimeProvider
      surfaceName={ADMIN_CX_DASHBOARD_SURFACE_NAME}
      getScope={() =>
        createAdminCxDashboardScope({ dashboard_section: section })
      }
      isEditable={false}
    >
      <div className="h-[calc(100dvh-2.5rem)] flex flex-col overflow-hidden">
        <div className="flex-shrink-0 border-b border-border bg-card/50 px-4">
          {detail ? (
            // On one conversation or one request the dashboard-wide sections are not this record's
            // views — the record carries its own tabs. Here the strip is where you are and the way up.
            <nav
              aria-label="CX Dashboard location"
              className="flex items-center gap-1 h-9 overflow-x-auto text-xs"
            >
              <AppLink
                href={BASE_PATH}
                className="px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 whitespace-nowrap"
              >
                CX Dashboard
              </AppLink>
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
              <AppLink
                href={detail.parent.href}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 whitespace-nowrap"
              >
                <detail.parent.icon className="w-3.5 h-3.5" />
                {detail.parent.label}
              </AppLink>
              <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="px-2 py-1.5 font-medium text-foreground whitespace-nowrap">
                {detail.label}
              </span>
            </nav>
          ) : (
            <nav className="flex items-center gap-1 h-9 overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <AppLink
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                      isActive
                        ? "bg-primary/10 text-primary-ink"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </AppLink>
                );
              })}
            </nav>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          <CxDashboardErrorBoundary>{children}</CxDashboardErrorBoundary>
        </div>
      </div>
    </SurfaceRuntimeProvider>
  );
}
