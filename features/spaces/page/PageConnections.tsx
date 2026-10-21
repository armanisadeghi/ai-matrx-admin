"use client";

// features/spaces/page/PageConnections.tsx — the ••• menu's "Connections" (A7), Notion's list of the apps
// that reach this page. Here an app reaches a page through the person's own connections (the agents on the
// page act as them), so the list is their live connections — the same truth Settings → Integrations shows —
// and "Add connections" opens that screen in a new tab.

import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ExternalLink, Plug } from "lucide-react";
import { useEffect } from "react";

import {
  fetchAvailability,
  fetchCatalog,
  selectMcpAvailabilityForOrganization,
  selectMcpAvailabilityStatusForOrganization,
  selectMcpCatalog,
  selectMcpCatalogStatus,
} from "@ai-matrx/chat/agents/redux/mcp/mcp.slice";
import { catalogConnectionPresentation } from "@/features/settings/pages/integration-catalog-state";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";

const SETTINGS_HREF = "/settings/integrations";

export function PageConnections() {
  const dispatch = useAppDispatch();
  const organizationId = useAppSelector(selectOrganizationId);
  const catalog = useAppSelector(selectMcpCatalog);
  const catalogStatus = useAppSelector(selectMcpCatalogStatus);
  const availability = useAppSelector((state) => selectMcpAvailabilityForOrganization(state, organizationId));
  const availabilityStatus = useAppSelector((state) => selectMcpAvailabilityStatusForOrganization(state, organizationId));
  useEffect(() => {
    if (catalogStatus === "idle") void dispatch(fetchCatalog());
  }, [catalogStatus, dispatch]);
  useEffect(() => {
    if (organizationId && availabilityStatus === "idle") void dispatch(fetchAvailability({ organizationId }));
  }, [organizationId, availabilityStatus, dispatch]);
  const loading = catalogStatus === "idle" || catalogStatus === "loading" || availabilityStatus === "idle" || availabilityStatus === "loading";
  const failed = catalogStatus === "failed" || availabilityStatus === "failed";
  const connected = catalog.filter((e) => catalogConnectionPresentation(e, undefined, false, availability[e.slug]).connected);
  return (
    <div>
      <p className="px-2 pb-1 pt-1.5 type-secondary text-muted-foreground">Active connections</p>
      {loading ? <RegionSkeleton shape="rows" count={3} aria-label="Loading connections" /> : null}
      {!loading && failed ? <p className="px-2 py-1 type-body text-muted-foreground">Connections could not be read</p> : null}
      {!loading && !failed && !connected.length ? <p className="px-2 py-1 type-body text-muted-foreground">No connections yet</p> : null}
      {!loading
        ? connected.map((e) => (
            <div key={e.slug} className="spaces-menu-row">
              <span className="spaces-menu-row-icon">
                {e.iconUrl ? <img src={e.iconUrl} alt="" width={16} height={16} /> : <Plug size={16} />}
              </span>
              <span className="flex-1 truncate text-left">{e.name}</span>
            </div>
          ))
        : null}
      <div className="my-1 border-t border-border" />
      <a href={SETTINGS_HREF} target="_blank" rel="noopener" className="spaces-menu-row" data-clickable="">
        <span className="spaces-menu-row-icon">
          <ExternalLink size={16} />
        </span>
        <span className="flex-1 truncate text-left">Add connections</span>
      </a>
    </div>
  );
}
