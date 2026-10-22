"use client";

// features/unified-data/pages/InterfaceRoute.tsx — lane AT-INTERFACE: ONE INTERFACE ON ITS OWN SCREEN.
//
// /data/interfaces/<id>?page=<pageId> opens an Interface (named pages built from tables); /data/interfaces/new?table=<id>
// makes one on that table. The organization is the interface's own, asked of `custom.interface_read` — the door a
// person outside the organization may also call when the interface is shared with her — never the active
// organization. Not there or not shared: the one AccessGate, with Request access. The screen is records-ui's
// `InterfaceScreen`, mounted through the same host every record-store surface binds (`MakeMount`).

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import { InterfaceScreen } from "@/features/data-tables/records-ui-host/recordsUiLazy";

import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { OrganizationContextNotice } from "@/features/organizations/components/OrganizationRequiredNotice";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import { useRecordsDataSource } from "@/features/data-tables/records-ui-host/recordsDataSource";
import { useObjectOrganization } from "@/features/unified-data/objectOrganization";
import { MakeMount } from "@/features/make/MakeMount";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

const PAGES_HOME = "/data/pages";

type Opened = { state: "resolving" } | { state: "open"; organizationId: string } | { state: "not-given" } | { state: "unavailable"; why: string };

/** The interface's organization, from the interface door (members and people it is shared with alike). */
function useInterfaceOrganization(interfaceId: string | null): Opened & { retry: () => void } {
  const dataSource = useRecordsDataSource();
  const [opened, setOpened] = useState<Opened>({ state: "resolving" });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!interfaceId) return;
    let live = true;
    void dataSource.rpc("interface_read", { p_interface_id: interfaceId }, { schema: "custom" }).then((answered: { data: unknown; error: { message?: string } | null }) => {
      if (!live) return;
      if (answered.error) setOpened({ state: "unavailable", why: answered.error.message ?? "The interface could not be opened." });
      else {
        const org = (answered.data as { organization_id?: string } | null)?.organization_id;
        setOpened(org ? { state: "open", organizationId: org } : { state: "not-given" });
      }
    });
    return () => {
      live = false;
    };
  }, [dataSource, interfaceId, tick]);
  return { ...opened, retry: () => setTick((n) => n + 1) };
}

export function InterfaceRoute({ interfaceId }: { interfaceId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const userId = useAppSelector(selectUserId);
  const dataSource = useRecordsDataSource();
  const making = interfaceId === "new";
  const tableId = making ? search.get("table") : null;
  const forTable = useObjectOrganization(dataSource, tableId);
  const forInterface = useInterfaceOrganization(making ? null : interfaceId);
  const where = making ? forTable : forInterface;
  const pageId = search.get("page");

  const back = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(PAGES_HOME);
  }, [router]);

  const header = ({ name, actions }: { name: string; actions: ReactNode }) => (
    <RouteHeader
      left={
        <>
          <ChevronLeftTapButton onClick={back} ariaLabel="Back" />
          <span className="truncate px-1.5 text-sm font-medium text-foreground">{name}</span>
        </>
      }
      right={actions}
    />
  );

  let body: ReactNode;
  if (!userId || where.state === "resolving") {
    body = <OrganizationContextNotice state="resolving" what="Interfaces" />;
  } else if (making && !tableId) {
    body = <p className="text-sm text-muted-foreground">Open a table to make an interface on it.</p>;
  } else if (where.state === "not-given") {
    body = (
      <AccessGate
        token="record"
        id={(making ? tableId : interfaceId) ?? ""}
        onRetry={where.retry}
        fallbackHref={PAGES_HOME}
        fallbackLabel="Back to pages"
      />
    );
  } else if (where.state === "unavailable") {
    body = (
      <p className="text-sm text-destructive">
        {where.why}
        <ErrorAlchemyMenu error={where.why} />
      </p>
    );
  } else {
    body = (
      <MakeMount organizationId={where.organizationId}>
        <InterfaceScreen
          {...(making ? { newOnTable: tableId } : { interfaceId })}
          pageId={pageId}
          onPage={(to) => router.replace(`/data/interfaces/${interfaceId}?page=${encodeURIComponent(to)}`, { scroll: false })}
          viewerUserId={userId}
          onCreated={(id) => router.replace(`/data/interfaces/${id}`)}
          onArchived={() => router.push(PAGES_HOME)}
          header={header}
        />
      </MakeMount>
    );
  }

  return (
    <div className="h-full overflow-hidden pt-[var(--shell-header-h)]">
      <RouteHeader
        fallback
        left={
          <>
            <ChevronLeftTapButton onClick={back} ariaLabel="Back" />
            <span className="truncate px-1.5 text-sm font-medium text-foreground">Interface</span>
          </>
        }
      />
      <div className="h-full overflow-y-auto px-3 pb-6 pt-2">{body}</div>
    </div>
  );
}
