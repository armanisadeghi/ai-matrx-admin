"use client";

// THE NEW APP FRAME — playground. The toolbar sits OUTSIDE the frame and
// switches product, variant, theme and width. Everything inside is static
// sample content.
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { SegmentedControl } from "@ai-matrx/design-system/controls";
import { AppFrame } from "@/features/shell/frame/AppFrame";
import { PRODUCTS, PRODUCT_FAMILIES, productById } from "@/features/shell/frame/products";
import { HeaderEndPlaceholders, defaultPageActions } from "@/features/shell/frame/SheetHeader";
import type { FrameCrumb, FrameVariant } from "@/features/shell/frame/types";
import {
  CONTACTS,
  ChatThread,
  ContactList,
  ContactProperties,
  ContactRecord,
  DocList,
  DocPage,
  WorkspaceSample,
} from "./samples";

type ProductId = "crm" | "docs" | "chat";
type Width = "1440" | "1280" | "1024" | "375";
type Theme = "light" | "dark";

const DEFAULT_VARIANT: Record<ProductId, FrameVariant> = { crm: "list", docs: "record", chat: "light" };

export function ShellPlayground() {
  const [productId, setProductId] = useState<ProductId>("crm");
  const [variant, setVariant] = useState<FrameVariant>("list");
  const [theme, setTheme] = useState<Theme>("light");
  const [width, setWidth] = useState<Width>("1440");
  const [favorites, setFavorites] = useState<string[]>(["chat", "crm", "docs"]);
  const [contactId, setContactId] = useState<string | null>(null);
  const [view, setView] = useState("all");
  const [starred, setStarred] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // The playground's theme switch drives the page's own dark class (portals included).
  useEffect(() => {
    const html = document.documentElement;
    const had = html.classList.contains("dark");
    html.classList.toggle("dark", theme === "dark");
    return () => {
      html.classList.toggle("dark", had);
    };
  }, [theme]);

  const product = productById(productId) ?? PRODUCTS[0];
  const phone = width === "375";
  const contact = CONTACTS.find((c) => c.id === contactId) ?? null;

  function pickProduct(id: ProductId) {
    setProductId(id);
    setVariant(DEFAULT_VARIANT[id]);
    setContactId(null);
    setStatus(null);
  }

  const say = (text: string) => () => setStatus(`${text} (sample)`);
  const actions = defaultPageActions({
    onCopyLink: say("Copy link pressed"),
    onOpenInNewTab: say("Open in new tab pressed"),
    onDelete: say("Delete pressed"),
  });

  // ── what the page shows, per product × variant ──
  let crumbs: FrameCrumb[];
  let body: React.ReactNode;
  let properties: React.ReactNode = undefined;
  let tabs: React.ComponentProps<typeof AppFrame>["tabs"] = undefined;
  let activeMenuItemId: string;
  let favoritable = false;
  let onBack: (() => void) | undefined;
  let statusText: string;

  if (productId === "crm") {
    activeMenuItemId = "people";
    const rows = CONTACTS.filter((c) =>
      view === "all" ? true : view === "customers" ? c.stage === "Customer" : c.stage !== "Customer",
    );
    const showRecord = variant === "record" || variant === "light";
    const record = contact ?? CONTACTS[0];
    if (showRecord) {
      crumbs = [
        { id: "crm", label: "CRM", href: "/crm", onSelect: () => setContactId(null) },
        { id: "people", label: "People & Companies", href: "/crm/people", onSelect: () => { setContactId(null); setVariant("list"); } },
        { id: record.id, label: record.name },
      ];
      body = <ContactRecord contact={record} />;
      properties = <ContactProperties contact={record} />;
      favoritable = true;
      onBack = () => { setContactId(null); setVariant("list"); };
      statusText = "Saved";
    } else {
      crumbs = [
        { id: "crm", label: "CRM", href: "/crm" },
        { id: "people", label: "People & Companies" },
      ];
      tabs = {
        label: "Contact views",
        value: view,
        onValueChange: setView,
        items: [
          { value: "all", label: "All contacts", count: CONTACTS.length },
          { value: "customers", label: "Customers", count: CONTACTS.filter((c) => c.stage === "Customer").length },
          { value: "pipeline", label: "Pipeline", count: CONTACTS.filter((c) => c.stage !== "Customer").length },
        ],
      };
      body =
        variant === "workspace" ? (
          <WorkspaceSample label="CRM board" />
        ) : (
          <ContactList
            rows={rows}
            phone={phone}
            onOpen={(c) => {
              setContactId(c.id);
              setVariant("record");
            }}
          />
        );
      statusText = `${rows.length} contacts`;
    }
  } else if (productId === "docs") {
    activeMenuItemId = "documents";
    if (variant === "list") {
      crumbs = [
        { id: "docs", label: "Docs", href: "/docs" },
        { id: "documents", label: "Documents" },
      ];
      tabs = {
        label: "Document views",
        value: view === "all" || view === "mine" || view === "shared" ? view : "all",
        onValueChange: setView,
        items: [
          { value: "all", label: "All" },
          { value: "mine", label: "Created by me" },
          { value: "shared", label: "Shared with me" },
        ],
      };
      body = <DocList phone={phone} onOpen={() => setVariant("record")} />;
      statusText = "4 documents";
    } else {
      crumbs = [
        { id: "docs", label: "Docs", href: "/docs", onSelect: () => setVariant("list") },
        { id: "handbook", label: "Company handbook", href: "/docs/f-handbook", onSelect: () => setVariant("list") },
        { id: "doc", label: "Onboarding checklist for new clinics" },
      ];
      body = variant === "workspace" ? <WorkspaceSample label="Slides canvas" /> : <DocPage />;
      favoritable = true;
      onBack = () => setVariant("list");
      statusText = "Saved · edited 10 min ago";
    }
  } else {
    activeMenuItemId = "c-1";
    crumbs = [
      { id: "chat", label: "Chat", href: "/chat" },
      { id: "c-1", label: "Quarterly plan outline" },
    ];
    body = variant === "workspace" ? <WorkspaceSample label="Chat canvas" /> : <ChatThread />;
    favoritable = true;
    statusText = "Synced";
  }

  const stageWidth = Number(width);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-textured">
      {/* The playground toolbar — outside the frame. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-2">
        <span className="type-title">App frame playground</span>
        <SegmentedControl<ProductId>
          aria-label="Product"
          value={productId}
          onValueChange={pickProduct}
          data={[
            { value: "chat", label: "Chat" },
            { value: "crm", label: "CRM" },
            { value: "docs", label: "Docs" },
          ]}
        />
        <SegmentedControl<FrameVariant>
          aria-label="Variant"
          value={variant}
          onValueChange={setVariant}
          data={[
            { value: "record", label: "Record" },
            { value: "list", label: "List" },
            { value: "workspace", label: "Workspace" },
            { value: "light", label: "Light" },
          ]}
        />
        <SegmentedControl<Theme>
          aria-label="Theme"
          value={theme}
          onValueChange={setTheme}
          data={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
        <SegmentedControl<Width>
          aria-label="Width"
          value={width}
          onValueChange={setWidth}
          data={[
            { value: "1440", label: "1440" },
            { value: "1280", label: "1280" },
            { value: "1024", label: "1024" },
            { value: "375", label: "375" },
          ]}
        />
        <span className="type-meta ml-auto text-muted-foreground">Static sample content</span>
      </div>

      {/* The stage: the frame at the chosen width. */}
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div
          data-testid="frame-stage"
          className="mx-auto overflow-hidden rounded-md outline outline-1 outline-border"
          style={{ width: stageWidth, height: phone ? 760 : "100%", minHeight: 560 }}
        >
          <AppFrame
            products={PRODUCTS}
            families={PRODUCT_FAMILIES}
            product={product}
            favorites={favorites}
            onFavoritesChange={setFavorites}
            activeMenuItemId={activeMenuItemId}
            onSelectMenuItem={(item) => setStatus(`${item.label} pressed (sample)`)}
            crumbs={crumbs}
            favorite={favoritable ? { starred, onToggle: () => setStarred((s) => !s) } : undefined}
            actions={actions}
            headerEnd={<HeaderEndPlaceholders />}
            onBack={onBack}
            tabs={tabs}
            variant={variant}
            properties={variant === "record" ? properties : undefined}
            status={
              <>
                {status ? null : <Check className="size-3.5" aria-hidden />}
                <span className="truncate">{status ?? statusText}</span>
              </>
            }
          >
            {body}
          </AppFrame>
        </div>
      </div>
    </div>
  );
}
