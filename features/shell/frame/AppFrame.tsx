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
import type { KeyboardEvent, ReactNode } from "react";
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
import type {
  FrameAction,
  FrameCrumb,
  FrameForm,
  FrameMenuItem,
  FrameProduct,
  FrameTab,
  FrameVariant,
  ProductFamily,
} from "./types";

/** Below this frame width the frame takes its phone form. */
export const FRAME_PHONE_BELOW_PX = 640;

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
  /** The right-side header slot (search, notifications, account). */
  headerEnd?: ReactNode;
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

function useMeasuredForm(forced: FrameForm | undefined) {
  const ref = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<FrameForm>("desktop");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || forced) return;
    const read = () =>
      setMeasured(el.getBoundingClientRect().width < FRAME_PHONE_BELOW_PX ? "phone" : "desktop");
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
    headerEnd,
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
  const drawerRef = useRef<HTMLDivElement>(null);

  const phone = form === "phone";
  const showSidebar = !phone && sidebarOpen;

  const grid: AppGridProps = { products, families, favorites, onFavoritesChange };

  function openDrawer() {
    setDrawerOpen(true);
    requestAnimationFrame(() =>
      drawerRef.current?.querySelector<HTMLElement>("button, a, [tabindex]")?.focus(),
    );
  }

  function onDrawerKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      setDrawerOpen(false);
    }
  }

  const phoneActions: FrameAction[] = [
    { id: "open-menu", label: `${product.name} menu`, icon: Menu, onSelect: openDrawer },
    {
      id: "agent",
      label: companionOpen ? "Close agent" : "Agent",
      icon: Webhook,
      onSelect: () => setCompanionOpen(!companionOpen),
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
        {!phone ? (
          <div
            className="mf-slide h-full shrink-0 overflow-hidden"
            style={{ width: showSidebar ? "var(--frame-sidebar-w)" : 0 }}
            inert={!showSidebar}
          >
            <div className="h-full w-[var(--frame-sidebar-w)]">
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

        {/* The sheet. */}
        <div
          className={cn(
            "mf-slide flex h-full min-w-0 flex-1 flex-col p-[var(--frame-inset)]",
            showSidebar && "pl-0",
          )}
        >
          <section className="mf-sheet flex h-full min-h-0 flex-col overflow-hidden">
            <SheetHeader
              form={form}
              crumbs={crumbs}
              favorite={favorite}
              actions={actions}
              phoneActions={phoneActions}
              end={headerEnd}
              start={
                !phone && !sidebarOpen ? (
                  <SidebarRestore
                    onShow={() => setSidebarOpen(true)}
                    grid={<AppGrid {...grid} currentProductId={product.id} />}
                  />
                ) : undefined
              }
              onOpenDrawer={openDrawer}
              onBack={onBack}
            />
            {tabs ? (
              <div className="mf-rule-b mf-noscrollbar flex h-[var(--frame-tabs-h)] shrink-0 items-center overflow-x-auto px-[calc(var(--frame-gutter)-8px)]">
                <Tabs
                  variant="capsule"
                  aria-label={tabs.label}
                  value={tabs.value}
                  onValueChange={tabs.onValueChange}
                  data={tabs.items.map((t) => ({ value: t.value, label: t.label, count: t.count }))}
                />
              </div>
            ) : null}

            <div className="relative flex min-h-0 flex-1">
              <FrameBody variant={variant} phone={phone} properties={properties}>
                {children}
              </FrameBody>
              {phone ? (
                companionOpen ? (
                  <div className="absolute inset-0 z-10 bg-[hsl(var(--frame-sheet))]">{companionBody}</div>
                ) : null
              ) : (
                <div
                  className="mf-slide mf-rule-l h-full shrink-0 overflow-hidden"
                  style={{
                    width: companionOpen ? "var(--frame-companion-w)" : 0,
                    borderLeftWidth: companionOpen ? 1 : 0,
                  }}
                  inert={!companionOpen}
                  aria-label="Agent"
                  role="complementary"
                >
                  <div className="h-full w-[var(--frame-companion-w)]">{companionBody}</div>
                </div>
              )}
            </div>

            {!phone ? (
              <SheetFooter
                status={status}
                companionOpen={companionOpen}
                onCompanionToggle={() => setCompanionOpen(!companionOpen)}
                onHistory={onHistory}
                onHelp={onHelp}
              />
            ) : null}
          </section>
        </div>

        {/* Phone drawer: inside the frame (not the window), so it follows the frame's box. */}
        {phone ? (
          <div
            className={cn("absolute inset-0 z-20", !drawerOpen && "pointer-events-none")}
            inert={!drawerOpen}
            onKeyDown={onDrawerKeyDown}
          >
            <button
              type="button"
              aria-label="Close menu"
              tabIndex={-1}
              className={cn(
                "mf-slide absolute inset-0 bg-black/30",
                drawerOpen ? "opacity-100" : "opacity-0",
              )}
              onClick={() => setDrawerOpen(false)}
            />
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label={`${product.name} menu`}
              className={cn(
                "mf-slide absolute inset-y-0 left-0 w-[min(85%,var(--frame-sidebar-w))] bg-[hsl(var(--frame-bg))]",
                drawerOpen ? "translate-x-0" : "-translate-x-full",
              )}
            >
              <FrameSidebar
                product={product}
                grid={grid}
                activeItemId={activeMenuItemId}
                onSelectItem={(item) => {
                  onSelectMenuItem?.(item);
                  setDrawerOpen(false);
                }}
                onHide={() => setDrawerOpen(false)}
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
        <div className="mx-auto w-full max-w-[760px] px-[var(--frame-gutter)] py-6">{children}</div>
      </div>
    );
  }
  // record: a centered content column + optional right properties panel.
  return (
    <>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[720px] px-[var(--frame-gutter)] py-8">
          {children}
          {phone && properties ? <div className="mf-rule-t mt-8 pt-4">{properties}</div> : null}
        </div>
      </div>
      {!phone && properties ? (
        <aside
          aria-label="Properties"
          className="mf-rule-l w-[var(--frame-properties-w)] shrink-0 overflow-y-auto px-4 py-4"
        >
          {properties}
        </aside>
      ) : null}
    </>
  );
}
