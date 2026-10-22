"use client";

// THE NEW APP FRAME — playground. The toolbar sits OUTSIDE the frame and
// switches product, variant, theme and width, outlines what is the frame's and
// what is the page's, and shows which heavy modules have loaded. Everything
// inside is static sample content.
import { openOutbound } from "@ai-matrx/kit/outbound";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, LayoutList } from "lucide-react";
import { Button, SegmentedControl } from "@ai-matrx/design-system/controls";
import { AppFrame } from "@/features/shell/frame/AppFrame";
import type { FrameHeaderEdge, FrameSidebarColor, FrameSpace } from "@/features/shell/frame/AppFrame";
import { PRODUCTS, PRODUCT_FAMILIES, productById } from "@/features/shell/frame/products";
import { INTELLIGENCE_PARTS, flowByName, flowForTile } from "@/features/shell/frame/flows";
import { BigPicture, FlowView } from "./FlowView";
import { HeaderToolButtons, defaultPageActions, placeholderHeaderTools } from "@/features/shell/frame/SheetHeader";
import type { FrameCrumb, FramePin, FrameProduct, FrameVariant } from "@/features/shell/frame/types";
import { defaultPins } from "@/features/shell/frame/products";
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

type SampleId = "crm" | "docs" | "chat";
type Width = "fit" | "2560" | "1920" | "1440" | "1280" | "1024" | "375";
type Theme = "light" | "dark";

const SAMPLE_IDS: readonly SampleId[] = ["chat", "crm", "docs"];

const DEFAULT_VARIANT: Record<SampleId, FrameVariant> = { crm: "list", docs: "record", chat: "light" };
const DEFAULT_ITEM: Record<SampleId, string> = { crm: "people", docs: "documents", chat: "c-1" };

// ── playground info: which frame modules have loaded (fed by the loaders themselves) ──
let loadedModules: readonly string[] = [];
const loadedListeners = new Set<() => void>();
function markLoaded(name: string) {
  if (loadedModules.includes(name)) return;
  loadedModules = [...loadedModules, name];
  loadedListeners.forEach((l) => l());
}
function useLoadedModules() {
  return useSyncExternalStore(
    (l) => {
      loadedListeners.add(l);
      return () => loadedListeners.delete(l);
    },
    () => loadedModules,
    () => loadedModules,
  );
}
// Stable loaders (module scope): the frame calls each one only when the person first opens it.
const loadSampleCompanion = () => {
  markLoaded("Side chat");
  return import("./SampleCompanion");
};
const loadSampleCanvas = () => {
  markLoaded("Canvas");
  return import("./SampleCanvas");
};

function isSample(id: string): id is SampleId {
  return (SAMPLE_IDS as readonly string[]).includes(id);
}

/** Every link in the playground stays on this page: `?product=<id>&item=<id>`. */
function labHref(product: string, item?: string) {
  return `/lab/shell?product=${encodeURIComponent(product)}${item ? `&item=${encodeURIComponent(item)}` : ""}`;
}

/** The real product list with every home and menu link pointed back at the playground. */
/**
 * A product's sidebar from its flow (features/shell/frame/flows): the flow's sections in order,
 * each row's hover text its real route. Intelligence shows its six parts as sidebar sections.
 * Row ids are `s-<index>` into the flow's section list, so a picked row finds its Map card.
 */
function flowMenu(p: FrameProduct): FrameProduct["menu"] | null {
  const row = (name: string, route: string | undefined, pages: number, index: number) => ({
    id: `s-${index}`,
    label: name,
    icon: LayoutList,
    count: pages,
    hint: route ?? name,
    href: labHref(p.id, `s-${index}`),
  });
  if (p.id === "intelligence") {
    let index = 0;
    return INTELLIGENCE_PARTS.map((part) => {
      const flow = flowByName(part);
      return {
        id: part,
        label: part,
        items: (flow?.sections ?? []).map((s) => row(s.name, s.route, s.pages.length, index++)),
      };
    });
  }
  const flow = flowForTile(p.name);
  if (!flow || flow.sections.length === 0) return null;
  return [{ id: "flow", items: flow.sections.map((s, i) => row(s.name, s.route, s.pages.length, i)) }];
}

const LAB_PRODUCTS: readonly FrameProduct[] = PRODUCTS.map((p) => ({
  ...p,
  homeHref: labHref(p.id),
  menu:
    flowMenu(p) ??
    p.menu.map((section) => ({
      ...section,
      items: section.items.map((item) => ({ ...item, href: labHref(p.id, item.id) })),
    })),
}));

export function ShellPlayground({ initialProduct, initialItem }: { initialProduct?: string; initialItem?: string }) {
  const startProduct = initialProduct && productById(initialProduct) ? initialProduct : "crm";
  const [productId, setProductId] = useState<string>(startProduct);
  const [variant, setVariant] = useState<FrameVariant>(isSample(startProduct) ? DEFAULT_VARIANT[startProduct] : "workspace");
  const [itemId, setItemId] = useState<string | null>(initialItem ?? null);
  const [theme, setTheme] = useState<Theme>("light");
  const [width, setWidth] = useState<Width>("fit");
  const [showOwner, setShowOwner] = useState(false);
  const loaded = useLoadedModules();
  const [headerEdge, setHeaderEdge] = useState<FrameHeaderEdge>("fade");
  const [space, setSpace] = useState<FrameSpace>("flush");
  const [bodyMode, setBodyMode] = useState<"flow" | "sample">("flow");
  const [bigPicture, setBigPicture] = useState(false);
  const [focusSection, setFocusSection] = useState<number | null>(
    initialItem?.startsWith("s-") ? Number(initialItem.slice(2)) : null,
  );
  const [sidebarColor, setSidebarColor] = useState<FrameSidebarColor>("same");
  const [favorites, setFavorites] = useState<string[]>([
    "chat",
    "memory",
    "workspace",
    "docs",
    "drive",
    "data",
    "crm",
    "intelligence",
    "meet",
  ]);
  const [contactId, setContactId] = useState<string | null>(null);
  const [view, setView] = useState("all");
  const [starred, setStarred] = useState<FramePin[]>([]);
  // Pinned: the starting set until edited here (the live frame saves through the favourites store).
  const [savedPins, setSavedPins] = useState<FramePin[] | null>(null);
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

  const product = LAB_PRODUCTS.find((p) => p.id === productId) ?? LAB_PRODUCTS[0];
  const phone = width === "375";
  const contact = CONTACTS.find((c) => c.id === contactId) ?? null;

  function pickProduct(id: SampleId) {
    setProductId(id);
    setItemId(null);
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
  // Stand-ins: the real host passes the live header controls (features/shell/frame-host/FrameChrome).
  const sampleTools = placeholderHeaderTools((id) => setStatus(`${id} pressed (sample)`));

  // ── what the page shows, per product × variant ──
  let crumbs: FrameCrumb[];
  let body: React.ReactNode;
  let properties: React.ReactNode = undefined;
  let tabs: React.ComponentProps<typeof AppFrame>["tabs"] = undefined;
  let activeMenuItemId: string;
  let onBack: (() => void) | undefined;
  let statusText: string;

  if (productId === "crm") {
    activeMenuItemId = itemId ?? DEFAULT_ITEM.crm;
    const rows = CONTACTS.filter((c) =>
      view === "all" ? true : view === "customers" ? c.stage === "Customer" : c.stage !== "Customer",
    );
    const showRecord = variant === "record" || variant === "light";
    const record = contact ?? CONTACTS[0];
    if (showRecord) {
      // The top level as its icon alone; the record is switchable (its siblings, the current one checked).
      crumbs = [
        { id: "crm", label: "CRM", icon: product.icon, iconOnly: true, href: labHref("crm"), onSelect: () => setContactId(null) },
        { id: "people", label: "Contacts", href: labHref("crm", "people"), onSelect: () => { setContactId(null); setVariant("list"); } },
        {
          id: record.id,
          label: record.name,
          optionsLabel: "People",
          options: CONTACTS.map((c) => ({
            label: c.name,
            href: labHref("crm", "people"),
            active: c.id === record.id,
            onSelect: () => setContactId(c.id),
          })),
        },
      ];
      body = <ContactRecord contact={record} />;
      properties = <ContactProperties contact={record} />;
      onBack = () => { setContactId(null); setVariant("list"); };
      statusText = "Saved";
    } else {
      crumbs = [
        { id: "crm", label: "CRM", icon: product.icon, iconOnly: true, href: labHref("crm") },
        { id: "people", label: "Contacts" },
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
    activeMenuItemId = itemId ?? DEFAULT_ITEM.docs;
    if (variant === "list") {
      crumbs = [
        { id: "docs", label: "Docs", href: labHref("docs") },
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
        { id: "docs", label: "Docs", href: labHref("docs"), onSelect: () => setVariant("list") },
        { id: "handbook", label: "Company handbook", href: labHref("docs", "f-handbook"), onSelect: () => setVariant("list") },
        { id: "doc", label: "Onboarding checklist for new clinics" },
      ];
      body = variant === "workspace" ? <WorkspaceSample label="Slides canvas" /> : <DocPage />;
      onBack = () => setVariant("list");
      statusText = "Saved · edited 10 min ago";
    }
  } else if (productId === "chat") {
    activeMenuItemId = itemId ?? DEFAULT_ITEM.chat;
    crumbs = [
      // Chat omits its top level: the chat sidebar already covers it.
      { id: "c-1", label: "Quarterly plan outline" },
    ];
    body = variant === "workspace" ? <WorkspaceSample label="Chat canvas" /> : <ChatThread />;
    statusText = "Synced";
  } else {
    // Any other product: its own sidebar and a labelled sample body.
    const items = product.menu.flatMap((section) => section.items);
    const item = items.find((i) => i.id === itemId) ?? items[0];
    activeMenuItemId = item.id;
    crumbs = [
      { id: product.id, label: product.name, href: labHref(product.id) },
      { id: item.id, label: item.label },
    ];
    body = <WorkspaceSample label={`${product.name} · ${item.label}`} />;
    statusText = "Sample product";
  }

  // FLOW MODE: the body is the product's flow (or the whole app's big picture), whatever the sample says.
  let frameVariant = variant;
  if (bodyMode === "flow") {
    frameVariant = "list";
    properties = undefined;
    tabs = undefined;
    onBack = undefined;
    const flow = flowForTile(product.name);
    if (bigPicture) {
      crumbs = [{ id: "big-picture", label: "Big picture" }];
      body = (
        <BigPicture
          products={LAB_PRODUCTS}
          families={PRODUCT_FAMILIES}
          onPick={(id) => {
            setProductId(id);
            setFocusSection(null);
            setBigPicture(false);
          }}
        />
      );
      statusText = "Every product and section";
    } else {
      crumbs = [
        { id: product.id, label: product.name, href: labHref(product.id), onSelect: () => setFocusSection(null) },
        { id: "flow", label: "Flow" },
      ];
      body = flow ? (
        <FlowView key={product.id} flow={flow} focusSection={focusSection} />
      ) : (
        <WorkspaceSample label={`${product.name} · no flow yet`} />
      );
      statusText = flow ? `${flow.sections.length} sections` : "No flow";
    }
    activeMenuItemId = focusSection === null ? "" : `s-${focusSection}`;
  }

  // Favoriting is a property of the page, never of the variant: every sample page can be starred.
  const pageKey = `${productId}:${crumbs[crumbs.length - 1].id}`;
  // The star IS the pin (as in the live frame): starring a page adds it to the sidebar's Pinned.
  const favorite = {
    starred: starred.some((p) => p.id === pageKey),
    onToggle: () =>
      setStarred((pins) =>
        pins.some((p) => p.id === pageKey)
          ? pins.filter((p) => p.id !== pageKey)
          : [
              ...pins,
              { id: pageKey, label: crumbs[crumbs.length - 1].label, href: `?product=${productId}&item=${crumbs[crumbs.length - 1].id}` },
            ],
      ),
  };
  const pins = [...(savedPins ?? defaultPins(LAB_PRODUCTS)), ...starred.filter((p) => !savedPins?.some((s) => s.id === p.id))];

  const fit = width === "fit";
  // The notes-like page (a Docs document) shows the faint ask bar; the others do not.
  const askBar = productId === "docs" && variant !== "list";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-textured">
      {/* The playground toolbar — outside the frame. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-2">
        <span className="type-title">App frame playground</span>
        <SegmentedControl<SampleId>
          aria-label="Product"
          value={isSample(productId) ? productId : null}
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
            { value: "fit", label: "Fit" },
            { value: "2560", label: "2560" },
            { value: "1920", label: "1920" },
            { value: "1440", label: "1440" },
            { value: "1280", label: "1280" },
            { value: "1024", label: "1024" },
            { value: "375", label: "375" },
          ]}
        />
        <SegmentedControl<"flow" | "sample">
          aria-label="Body"
          value={bodyMode}
          onValueChange={setBodyMode}
          data={[
            { value: "flow", label: "Flow" },
            { value: "sample", label: "Sample" },
          ]}
        />
        <Button
          variant={bigPicture ? "outline" : "quiet"}
          aria-pressed={bigPicture}
          onClick={() => {
            setBodyMode("flow");
            setBigPicture(!bigPicture);
          }}
        >
          Big picture
        </Button>
        <SegmentedControl<FrameSpace>
          aria-label="Space around"
          value={space}
          onValueChange={setSpace}
          data={[
            { value: "inset", label: "Inset" },
            { value: "flush", label: "Flush" },
          ]}
        />
        <Button variant="quiet" onClick={() => setSavedPins(null)} disabled={savedPins === null}>
          Reset pins
        </Button>
        <SegmentedControl<FrameSidebarColor>
          aria-label="Sidebar color"
          value={sidebarColor}
          onValueChange={setSidebarColor}
          data={[
            { value: "contrast", label: "Contrast" },
            { value: "same", label: "Same" },
          ]}
        />
        <SegmentedControl<FrameHeaderEdge>
          aria-label="Header edge"
          value={headerEdge}
          onValueChange={setHeaderEdge}
          data={[
            { value: "hairline", label: "Hairline" },
            { value: "fade", label: "Fade" },
          ]}
        />
        <Button
          variant={showOwner ? "outline" : "quiet"}
          aria-pressed={showOwner}
          onClick={() => setShowOwner(!showOwner)}
        >
          Show what&apos;s ours
        </Button>
        {showOwner ? (
          <span className="type-meta flex items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1">
              <span aria-hidden className="size-2.5 rounded-sm border-2 border-dashed border-primary" />
              Frame
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden className="size-2.5 rounded-sm border-2 border-dashed border-success" />
              Page
            </span>
          </span>
        ) : null}
        <span className="type-meta ml-auto text-muted-foreground" data-testid="modules-loaded">
          Playground info · loaded: {loaded.length > 0 ? loaded.join(", ") : "none"}
        </span>
      </div>

      {/* The stage: the frame at the chosen width. */}
      <div className={fit ? "min-h-0 flex-1 overflow-hidden" : "min-h-0 flex-1 overflow-auto p-4"}>
        <div
          data-testid="frame-stage"
          data-mf-show-owner={showOwner ? "" : undefined}
          className={fit ? "h-full w-full" : "mx-auto overflow-hidden rounded-md outline outline-1 outline-border"}
          style={fit ? undefined : { width: Number(width), height: phone ? 760 : "100%", minHeight: 560 }}
        >
          <AppFrame
            products={LAB_PRODUCTS}
            families={PRODUCT_FAMILIES}
            product={product}
            favorites={favorites}
            onFavoritesChange={setFavorites}
            // The lab has no app behind it: "Go to" opens the real page on the live site.
            onGoTo={(href) => openOutbound(`https://www.aimatrx.com${href}`, "_blank", "noopener,noreferrer")}
            activeMenuItemId={activeMenuItemId}
            onSelectMenuItem={(item) => {
              if (bodyMode === "flow" && item.id.startsWith("s-")) {
                setBigPicture(false);
                setFocusSection(Number(item.id.slice(2)));
                return;
              }
              setItemId(item.id);
              setStatus(`${item.label} opened (sample)`);
            }}
            crumbs={crumbs}
            favorite={favorite}
            pins={pins}
            onPinsChange={(next) => {
              setSavedPins(next);
              setStarred([]);
              setStatus("Pins saved (sample)");
            }}
            actions={actions}
            headerTools={<HeaderToolButtons tools={sampleTools} />}
            phoneTools={sampleTools}
            onBack={onBack}
            tabs={tabs}
            variant={frameVariant}
            properties={frameVariant === "record" ? properties : undefined}
            askBar={askBar}
            headerEdge={headerEdge}
            space={space}
            sidebarColor={sidebarColor}
            loadCompanion={loadSampleCompanion}
            loadCanvas={loadSampleCanvas}
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
