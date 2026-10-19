"use client";

// THE NEW APP FRAME (owner model, 2026-10-17) — Google-Workspace-shaped: many
// products, each with its own sidebar, held together by the app grid, one
// header row, an optional tabs row and one footer. Visual reference: Linear.
//
//   [sidebar on the app background, no border] [ SHEET: header / tabs / body / footer ]
//
// The header, tabs row and footer are IDENTICAL in every variant; `variant`
// changes only the body. Host-agnostic on purpose (props in; design-system,
// lucide and cn only) so the move into @ai-matrx/shell is a copy.
import "./frame.css";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Menu, Webhook } from "lucide-react";
import { PortalContainerProvider } from "@ai-matrx/design-system";
import { Tabs } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";
import { AppGrid } from "./AppGrid";
import type { AppGridProps } from "./AppGrid";
import { FrameSidebar } from "./FrameSidebar";
import { CompanionPlaceholder, SheetFooter } from "./SheetFooter";
import { SheetHeader, SidebarRestore } from "./SheetHeader";
import type { FrameFavorite } from "./SheetHeader";
import { useModalPanel } from "./useModalPanel";
import type {
  FrameAction,
  FrameCrumb,
  FrameForm,
  FrameHeaderTool,
  FrameMenuItem,
  FrameProduct,
  FrameTab,
  FrameVariant,
  ProductFamily,
} from "./types";

/** Below this frame width the frame takes its phone form. */
export const FRAME_PHONE_BELOW_PX = 640;
/**
 * Below this frame width the frame takes its medium form: the sidebar becomes a
 * drawer and the companion replaces the properties panel while open, so the body never drops under
 * `--matrx-frame-body-min-w` (at 1280 with sidebar + companion + properties open
 * the record column is still 372px).
 */
export const FRAME_MEDIUM_BELOW_PX = 1280;

export interface AppFrameProps {
  // ── the product ──
  products: readonly FrameProduct[];
  families: readonly { id: ProductFamily; label: string }[];
  product: FrameProduct;
  favorites: readonly string[];
  onFavoritesChange: (ids: string[]) => void;
  activeMenuItemId?: string;
  onSelectMenuItem?: (item: FrameMenuItem) => void;
  // ── the header ──
  crumbs: readonly FrameCrumb[];
  /** Only when the item can be favorited. */
  favorite?: FrameFavorite;
  /** The "…" items — always shown. See `defaultPageActions`. */
  actions: readonly FrameAction[];
  /** The right-side header tools (search, notifications, account); see `placeholderHeaderTools`. */
  headerTools?: readonly FrameHeaderTool[];
  /** Phone: where back goes. Without it, a nested page shows the menu button. */
  onBack?: () => void;
  // ── the tabs row (only when given) ──
  tabs?: {
    items: readonly FrameTab[];
    value: string;
    onValueChange: (value: string) => void;
    label: string;
  };
  // ── the body ──
  variant: FrameVariant;
  /** `record` only: the right properties panel. */
  properties?: ReactNode;
  children: ReactNode;
  // ── the footer ──
  status?: ReactNode;
  /** The companion's content; the frame shows a labeled stand-in without it. */
  companion?: ReactNode;
  companionOpen?: boolean;
  onCompanionOpenChange?: (open: boolean) => void;
  onHistory?: () => void;
  onHelp?: () => void;
  // ── layout ──
  /** Force a form; by default the frame measures its own width. */
  form?: FrameForm;
  sidebarOpen?: boolean;
  onSidebarOpenChange?: (open: boolean) => void;
  className?: string;
}

function formFor(width: number): FrameForm {
  if (width < FRAME_PHONE_BELOW_PX) return "phone";
  if (width < FRAME_MEDIUM_BELOW_PX) return "medium";
  return "desktop";
}

function useMeasuredForm(forced: FrameForm | undefined) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState<FrameForm>("desktop");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || forced) return;
    const read = () => setMeasured(formFor(el.getBoundingClientRect().width));
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [forced]);
  return { ref, form: forced ?? measured };
}

function useControllable(value: boolean | undefined, onChange: ((v: boolean) => void) | undefined, initial: boolean) {
  const [inner, setInner] = useState(initial);
  const current = value ?? inner;
  const set = (next: boolean) => {
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  return [current, set] as const;
}

export function AppFrame(props: AppFrameProps) {
  const {
    products,
    families,
    product,
    favorites,
    onFavoritesChange,
    activeMenuItemId,
    onSelectMenuItem,
    crumbs,
    favorite,
    actions,
    headerTools,
    onBack,
    tabs,
    variant,
    properties,
    children,
    status,
    companion,
    onHistory,
    onHelp,
    className,
  } = props;
  const { ref, form } = useMeasuredForm(props.form);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useControllable(props.sidebarOpen, props.onSidebarOpenChange, true);
  const [companionOpen, setCompanionOpen] = useControllable(
    props.companionOpen,
    props.onCompanionOpenChange,
    false,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const drawerRef = useRef<HTMLDivElement>(null);
  const companionRef = useRef<HTMLDivElement>(null);

  const phone = form === "phone";
  const medium = form === "medium";
  // Desktop keeps the sidebar inline; medium and phone show it as a drawer.
  const inlineSidebar = form === "desktop";
  const showSidebar = inlineSidebar && sidebarOpen;
  const drawerShown = !inlineSidebar && drawerOpen;
  const phoneCompanion = phone && companionOpen;
  // Medium: the properties panel and the companion take turns; the footer toggle brings properties back.
  const propertiesShown = Boolean(properties) && (!medium || (propertiesOpen && !companionOpen));

  const grid: AppGridProps = { products, families, favorites, onFavoritesChange };

  const drawer = useModalPanel({
    open: drawerShown,
    panelRef: drawerRef,
    onClose: () => setDrawerOpen(false),
    root,
  });
  const phoneCompanionPanel = useModalPanel({
    open: phoneCompanion,
    panelRef: companionRef,
    onClose: () => setCompanionOpen(false),
    root,
  });

  function openDrawer() {
    drawer.rememberOpener();
    setDrawerOpen(true);
  }
  function closeDrawer() {
    setDrawerOpen(false);
  }
  function toggleCompanion() {
    if (!companionOpen && phone) phoneCompanionPanel.rememberOpener();
    setCompanionOpen(!companionOpen);
  }
  function toggleProperties() {
    if (propertiesShown) setPropertiesOpen(false);
    else {
      setPropertiesOpen(true);
      setCompanionOpen(false);
    }
  }

  // Chosen from the "…" menu, whose item is gone once it closes: focus returns to the menu's trigger.
  const menuTrigger = () => root?.querySelector<HTMLElement>('header [aria-haspopup="menu"]') ?? null;
  const phoneActions: FrameAction[] = [
    {
      id: "open-menu",
      label: `${product.name} menu`,
      icon: Menu,
      onSelect: () => {
        drawer.rememberOpener(menuTrigger());
        setDrawerOpen(true);
      },
    },
    {
      id: "agent",
      label: companionOpen ? "Close agent" : "Agent",
      icon: Webhook,
      onSelect: () => {
        if (!companionOpen) phoneCompanionPanel.rememberOpener(menuTrigger());
        setCompanionOpen(!companionOpen);
      },
    },
  ];

  const companionBody = companion ?? <CompanionPlaceholder onClose={() => setCompanionOpen(false)} />;

  return (
    <div
      ref={(el) => {
        ref.current = el;
        setRoot(el);
      }}
      data-matrx-frame=""
      data-form={form}
      data-variant={variant}
      className={cn("relative flex h-full w-full min-w-0 overflow-hidden", className)}
    >
      <PortalContainerProvider container={root}>
        {/* Desktop sidebar: the outer box slides its width; the content keeps its width. */}
        {inlineSidebar ? (
          <div
            className="mf-slide h-full shrink-0 overflow-hidden"
            style={{ width: showSidebar ? "var(--matrx-frame-sidebar-w)" : 0 }}
            inert={!showSidebar}
          >
            <div className="h-full w-[var(--matrx-frame-sidebar-w)]">
              <FrameSidebar
                product={product}
                grid={grid}
                activeItemId={activeMenuItemId}
                onSelectItem={onSelectMenuItem}
                onHide={() => setSidebarOpen(false)}
                hideLabel="Hide sidebar"
              />
            </div>
          </div>
        ) : null}

        {/* The sheet — inert while the drawer is open. */}
        <div
          className={cn(
            "mf-slide flex h-full min-w-0 flex-1 flex-col p-[var(--matrx-frame-inset)]",
            showSidebar && "pl-0",
          )}
          inert={drawerShown}
        >
          <section className="mf-sheet flex h-full min-h-0 flex-col overflow-hidden">
            <SheetHeader
              form={form}
              crumbs={crumbs}
              favorite={favorite}
              actions={actions}
              phoneActions={phoneActions}
              tools={headerTools}
              start={
                !phone && !showSidebar ? (
                  <SidebarRestore
                    onShow={() => (inlineSidebar ? setSidebarOpen(true) : openDrawer())}
                    grid={<AppGrid {...grid} currentProductId={product.id} />}
                  />
                ) : undefined
              }
              onOpenDrawer={openDrawer}
              onBack={onBack}
            />
            {tabs ? (
              <div className="mf-rule-b mf-noscrollbar mf-tabs-row flex h-[var(--matrx-frame-tabs-h)] shrink-0 items-center overflow-x-auto">
                <Tabs
                  variant="capsule"
                  aria-label={tabs.label}
                  value={tabs.value}
                  onValueChange={tabs.onValueChange}
                  data={tabs.items.map((t) => ({ value: t.value, label: t.label, count: t.count }))}
                />
              </div>
            ) : null}

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              {/* The body is inert while the phone companion covers it. */}
              <div className="flex min-h-0 min-w-0 flex-1" inert={phoneCompanion}>
                <FrameBody variant={variant} phone={phone} properties={propertiesShown ? properties : undefined}>
                  {children}
                </FrameBody>
              </div>
              {phone ? (
                phoneCompanion ? (
                  <div
                    ref={companionRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Agent"
                    onKeyDown={phoneCompanionPanel.onKeyDown}
                    className="mf-surface-sheet matrx-touch-targets absolute inset-0 z-10"
                  >
                    {companionBody}
                  </div>
                ) : null
              ) : (
                <div
                  className="mf-slide mf-rule-l h-full shrink-0 overflow-hidden"
                  style={{
                    width: companionOpen ? "var(--matrx-frame-companion-w)" : 0,
                    borderLeftWidth: companionOpen ? 1 : 0,
                  }}
                  inert={!companionOpen}
                  aria-label="Agent"
                  role="complementary"
                >
                  <div className="h-full w-[var(--matrx-frame-companion-w)]">{companionBody}</div>
                </div>
              )}
            </div>

            {!phone ? (
              <SheetFooter
                status={status}
                companionOpen={companionOpen}
                onCompanionToggle={toggleCompanion}
                propertiesToggle={
                  medium && properties ? { shown: propertiesShown, onToggle: toggleProperties } : undefined
                }
                onHistory={onHistory}
                onHelp={onHelp}
              />
            ) : null}
          </section>
        </div>

        {/* The drawer (medium + phone): inside the frame, not the window, so it follows the frame's box. */}
        {!inlineSidebar ? (
          <div
            // matrx-touch-targets: drawer rows and buttons get the platform's 44px touch floor.
            className={cn("mf-drawer-layer matrx-touch-targets absolute inset-0 z-20", !drawerShown && "invisible")}
            data-open={drawerShown ? "" : undefined}
            inert={!drawerShown}
          >
            <button
              type="button"
              aria-label="Close menu"
              tabIndex={-1}
              className={cn("mf-slide mf-scrim absolute inset-0", drawerShown ? "opacity-100" : "opacity-0")}
              onClick={closeDrawer}
            />
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label={`${product.name} menu`}
              onKeyDown={drawer.onKeyDown}
              className={cn(
                "mf-slide mf-surface-canvas mf-drawer-w absolute inset-y-0 left-0",
                drawerShown ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <FrameSidebar
                product={product}
                grid={grid}
                activeItemId={activeMenuItemId}
                onSelectItem={(item) => {
                  onSelectMenuItem?.(item);
                  closeDrawer();
                }}
                onHide={closeDrawer}
                hideLabel="Close menu"
              />
            </div>
          </div>
        ) : null}
      </PortalContainerProvider>
    </div>
  );
}

function FrameBody({
  variant,
  phone,
  properties,
  children,
}: {
  variant: FrameVariant;
  phone: boolean;
  properties?: ReactNode;
  children: ReactNode;
}) {
  if (variant === "workspace") {
    return <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>;
  }
  if (variant === "list") {
    return <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>;
  }
  if (variant === "light") {
    return (
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-[var(--matrx-frame-gutter)] py-6">{children}</div>
      </div>
    );
  }
  // record: a centered content column (never under the body min width) + optional properties panel.
  return (
    <>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          phone ? "min-w-0" : "min-w-[var(--matrx-frame-body-min-w)]",
        )}
      >
        <div className="mx-auto w-full max-w-3xl px-[var(--matrx-frame-gutter)] py-8">
          {children}
          {phone && properties ? <div className="mf-rule-t mt-8 pt-4">{properties}</div> : null}
        </div>
      </div>
      {!phone && properties ? (
        <aside
          aria-label="Properties"
          className="mf-rule-l w-[var(--matrx-frame-properties-w)] shrink-0 overflow-y-auto px-4 py-4"
        >
          {properties}
        </aside>
      ) : null}
    </>
  );
}
