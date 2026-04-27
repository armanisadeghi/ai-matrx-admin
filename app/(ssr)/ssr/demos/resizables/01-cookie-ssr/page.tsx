import { cookies } from "next/headers";
import { Panel, Separator, type Layout } from "react-resizable-panels";
import { createRouteMetadata } from "@/utils/route-metadata";
import { ClientGroup } from "./ClientGroup";

export const metadata = createRouteMetadata(
  "/ssr/demos/resizables/01-cookie-ssr",
  {
    title: "01 · Cookie-backed SSR persistence",
    description:
      "Server reads the cookie, passes defaultLayout, client wrapper writes on pointer-up.",
  },
);

const GROUP_ID = "demo-01";
const COOKIE_NAME = `panels:${GROUP_ID}`;

async function readLayoutCookie(): Promise<Layout | undefined> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return undefined;
  try {
    return JSON.parse(decodeURIComponent(raw)) as Layout;
  } catch {
    return undefined;
  }
}

// SERVER COMPONENT. Reads the cookie at request time, passes it down.
// The actual <Group> is rendered inside ClientGroup ('use client') because
// onLayoutChanged is a function and functions can't cross the RSC boundary.
// The Panels themselves are instantiated here in the server component, with
// server-rendered children — RSC composition allows this.
export default async function ResizableCookieSsrDemo() {
  const defaultLayout = await readLayoutCookie();

  return (
    <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden bg-textured">
      <header className="border-b border-border bg-card px-4 py-2">
        <h1 className="text-sm font-medium">
          Demo 01 — cookie-backed SSR persistence
        </h1>
        <p className="text-xs text-muted-foreground">
          Drag any separator, reload the page — sizes are restored from the{" "}
          <code className="text-foreground">{COOKIE_NAME}</code> cookie before
          first paint.
        </p>
      </header>

      <div className="flex-1 overflow-hidden">
        <ClientGroup
          id={GROUP_ID}
          cookieName={COOKIE_NAME}
          orientation="horizontal"
          defaultLayout={defaultLayout}
          className="h-full w-full"
        >
          <Panel id="left" defaultSize="20%" minSize="10%">
            <div className="h-full p-4 bg-muted">
              <h2 className="text-sm font-medium mb-2">Left</h2>
              <p className="text-xs text-muted-foreground">
                <code>id=&quot;left&quot;</code> · default 20%
              </p>
            </div>
          </Panel>

          <Separator className="w-0.5 bg-border data-[separator=hover]:bg-primary data-[separator=dragging]:bg-primary transition-colors cursor-col-resize" />

          <Panel id="center" defaultSize="60%" minSize="30%">
            <div className="h-full p-4 bg-card">
              <h2 className="text-sm font-medium mb-2">Center</h2>
              <p className="text-xs text-muted-foreground">
                <code>id=&quot;center&quot;</code> · default 60%
              </p>
            </div>
          </Panel>

          <Separator className="w-0.5 bg-border data-[separator=hover]:bg-primary data-[separator=dragging]:bg-primary transition-colors cursor-col-resize" />

          <Panel id="right" defaultSize="20%" minSize="10%">
            <div className="h-full p-4 bg-muted">
              <h2 className="text-sm font-medium mb-2">Right</h2>
              <p className="text-xs text-muted-foreground">
                <code>id=&quot;right&quot;</code> · default 20%
              </p>
            </div>
          </Panel>
        </ClientGroup>
      </div>
    </div>
  );
}
