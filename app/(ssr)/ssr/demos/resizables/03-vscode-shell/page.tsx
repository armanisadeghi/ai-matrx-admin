import { Panel } from "react-resizable-panels";
import {
  Files,
  Search,
  GitBranch,
  Settings as SettingsIcon,
} from "lucide-react";
import PageHeader from "@/features/shell/components/header/PageHeader";
import { createRouteMetadata } from "@/utils/route-metadata";
import { cn } from "@/styles/themes/utils";
import { ClientGroup } from "../_lib/ClientGroup";
import { Handle } from "../_lib/Handle";
import { PanelControlProvider } from "../_lib/PanelControlProvider";
import { RegisteredPanel } from "../_lib/RegisteredPanel";
import { readLayoutCookie } from "../_lib/readLayoutCookie";
import { VSCodeHeaderControls } from "./HeaderControls";

export const metadata = createRouteMetadata(
  "/ssr/demos/resizables/03-vscode-shell",
  {
    title: "03 · VSCode shell (nested groups)",
    description:
      "Activity bar + sidebar + (editor over terminal) + chat. Two cookies — one per group — read in parallel server-side.",
  },
);

const ROOT_COOKIE = "panels:demo-03:root";
const MAIN_COOKIE = "panels:demo-03:main";

export default async function VSCodeShellPage() {
  const [rootLayout, mainLayout] = await Promise.all([
    readLayoutCookie(ROOT_COOKIE),
    readLayoutCookie(MAIN_COOKIE),
  ]);

  return (
    <PanelControlProvider>
      <PageHeader>
        <VSCodeHeaderControls />
      </PageHeader>

      <div className="h-full overflow-hidden">
        <ClientGroup
          id="demo-03-root"
          cookieName={ROOT_COOKIE}
          orientation="horizontal"
          defaultLayout={rootLayout}
          className="h-full w-full"
        >
          <Panel
            id="activity-bar"
            defaultSize="44px"
            minSize="44px"
            maxSize="44px"
          >
            <ActivityBar />
          </Panel>
          {/* disabled — fixed activity bar can't be user-resized */}
          <Handle disabled />

          <RegisteredPanel
            registerAs="sidebar"
            id="sidebar"
            collapsible
            collapsedSize="0%"
            defaultSize="18%"
            minSize="5%"
          >
            <Sidebar />
          </RegisteredPanel>
          <Handle />

          <Panel id="main" minSize="30%">
            <ClientGroup
              id="demo-03-main"
              cookieName={MAIN_COOKIE}
              orientation="vertical"
              defaultLayout={mainLayout}
              className="h-full w-full"
            >
              <Panel id="editor" minSize="20%">
                <EditorSurface />
              </Panel>
              <Handle />
              <RegisteredPanel
                registerAs="terminal"
                id="terminal"
                collapsible
                collapsedSize="0%"
                defaultSize="28%"
                minSize="5%"
              >
                <TerminalSurface />
              </RegisteredPanel>
            </ClientGroup>
          </Panel>
          <Handle />

          <RegisteredPanel
            registerAs="chat"
            id="chat"
            collapsible
            collapsedSize="0%"
            defaultSize="22%"
            minSize="5%"
          >
            <ChatSurface />
          </RegisteredPanel>
        </ClientGroup>
      </div>
    </PanelControlProvider>
  );
}

// ─── Server-rendered panel surfaces ─────────────────────────────────────────

function ActivityBar() {
  const icons = [Files, Search, GitBranch, SettingsIcon];
  return (
    <div className="h-full bg-muted flex flex-col items-center py-2 gap-1">
      {icons.map((Icon, i) => (
        <div
          key={i}
          className={cn(
            "p-1.5 rounded text-muted-foreground",
            i === 0 && "text-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      ))}
    </div>
  );
}

function Sidebar() {
  const items = ["src", "components", "features", "app", "package.json", "README.md"];
  return (
    <div className="h-full overflow-auto bg-muted">
      <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        Explorer
      </div>
      <ul className="text-sm">
        {items.map((name) => (
          <li
            key={name}
            className="px-3 py-1 cursor-pointer hover:bg-accent text-foreground/80 hover:text-foreground"
          >
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditorSurface() {
  return (
    <div className="h-full overflow-auto bg-card">
      <div className="px-4 py-2 border-b border-border text-xs text-muted-foreground">
        page.tsx
      </div>
      <pre className="p-4 text-xs leading-relaxed text-foreground/90 font-mono">
{`<ClientGroup id="demo-03-root" defaultLayout={rootLayout}>
  <Panel id="activity-bar" defaultSize="44px" />
  <Handle disabled />
  <RegisteredPanel registerAs="sidebar" collapsible defaultSize="18%" minSize="5%" />
  <Handle />
  <Panel id="main">
    <ClientGroup id="demo-03-main" orientation="vertical" defaultLayout={mainLayout}>
      <Panel id="editor" />
      <Handle />
      <RegisteredPanel registerAs="terminal" collapsible defaultSize="28%" />
    </ClientGroup>
  </Panel>
  <Handle />
  <RegisteredPanel registerAs="chat" collapsible defaultSize="22%" minSize="5%" />
</ClientGroup>`}
      </pre>
    </div>
  );
}

function TerminalSurface() {
  return (
    <div className="h-full overflow-auto bg-background">
      <div className="px-4 py-2 border-b border-border text-xs text-muted-foreground">
        Terminal
      </div>
      <pre className="p-4 text-xs leading-relaxed text-green-500 font-mono">
{`$ pnpm dev
> next dev (Turbopack)
ready - started server on http://localhost:3000`}
      </pre>
    </div>
  );
}

function ChatSurface() {
  return (
    <div className="h-full overflow-auto bg-muted">
      <div className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        Chat
      </div>
      <div className="p-3 space-y-2 text-xs">
        <div className="bg-accent rounded p-2 text-foreground">
          Refactor the layout to use nested Groups.
        </div>
        <div className="bg-card rounded p-2 text-foreground/80">
          Done — outer is horizontal, inner is vertical for the terminal.
        </div>
      </div>
    </div>
  );
}
