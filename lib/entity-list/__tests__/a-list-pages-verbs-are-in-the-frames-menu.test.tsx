/**
 * "…" HOLDS EVERY ACTION OF THE LIST PAGE (Arman, 2026-10-22, on /marketing/brands/all: "The ...
 * menu doesn't have all of the page's core options, such as 'add brand'"). A list page's verbs are
 * one list (`EntityListPage actions`): the header row draws them and the frame's "…" carries every
 * one. Before: Add brand was a loose `headerActions` button and "…" held only Copy link / Open in
 * new tab — the declared list here was empty (RED); now it holds the page's verbs (GREEN).
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Globe, Plus } from "lucide-react";
import type { FrameAction } from "@/features/shell/frame/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/marketing/brands/all" }));

let listProps: Record<string, unknown> | null = null;
jest.mock("@/lib/entity-list/components/EntityListPage", () => ({
  EntityListPage: (props: Record<string, unknown>) => {
    listProps = props;
    return null;
  },
}));
jest.mock("@/features/shell/components/header/templates/RecordPageHeader", () => ({ RecordPageHeader: () => null }));
jest.mock("@/features/overlays/definitions/createBrandWindow.overlay", () => ({ useOpenCreateBrandWindow: () => jest.fn() }));
jest.mock("@/features/marketing/components/brands/browse/listConfig", () => ({ brandListConfig: {} }));
jest.mock("@/features/marketing/components/brands/browse/surface", () => ({ BRAND_LIST_SURFACE: {} }));
jest.mock("@/features/marketing/components/brands/browse/service", () => ({ forgetBrandListReads: jest.fn() }));
jest.mock("@/features/marketing/components/shared/MarketingWorkspaceNav", () => ({ MARKETING_WORKSPACE_ROUTES: [] }));

/* eslint-disable @typescript-eslint/no-require-imports */
const { FramePageHeaderContext } = require("@/features/shell/frame-host/framePageHeader") as typeof import("@/features/shell/frame-host/framePageHeader");
const { useDeclareListPageActions, frameActionsOf } = require("../components/ListPageActions") as typeof import("../components/ListPageActions");
const { BrandsListPage } = require("@/features/marketing/components/brands/browse/BrandsListPage") as typeof import("@/features/marketing/components/brands/browse/BrandsListPage");
/* eslint-enable @typescript-eslint/no-require-imports */

function renderInFrame(node: React.ReactNode): FrameAction[] {
  let declared: FrameAction[] = [];
  const host = { declareCrumbs: () => () => {}, declareActions: (a: readonly FrameAction[]) => ((declared = [...a]), () => {}) };
  const root = createRoot(document.createElement("div"));
  act(() => root.render(<FramePageHeaderContext.Provider value={host}>{node}</FramePageHeaderContext.Provider>));
  return declared;
}

describe("a list page's verbs are in the frame's \"…\"", () => {
  test("every action is declared; a press runs it in place or goes to its page", () => {
    const add = jest.fn();
    function Probe() {
      useDeclareListPageActions([
        { id: "add", label: "Add brand", icon: Plus, primary: true, onPress: add },
        { id: "site", label: "New website", icon: Globe, href: "/marketing/brands/new-website" },
      ]);
      return null;
    }
    const declared = renderInFrame(<Probe />);
    expect(declared.map((a) => a.label)).toEqual(["Add brand", "New website"]);
    act(() => declared[0].onSelect());
    expect(add).toHaveBeenCalledTimes(1);
    act(() => declared[1].onSelect());
    expect(push).toHaveBeenCalledWith("/marketing/brands/new-website");
  });

  test("an action with nowhere to go is not offered", () => {
    expect(frameActionsOf([{ id: "x", label: "Nothing", icon: Plus }], () => {})).toEqual([]);
  });

  test("/marketing/brands/all hands Add brand and Smart Add to the list's one action list", () => {
    renderInFrame(<BrandsListPage />);
    const actions = (listProps?.actions ?? []) as { label: string; primary?: boolean; onPress?: unknown; href?: string }[];
    expect(actions.find((a) => a.label === "Add brand")).toMatchObject({ primary: true });
    expect(actions.find((a) => a.label === "Add brand")?.onPress).toBeInstanceOf(Function);
    expect(actions.find((a) => a.label === "Smart Add")?.href).toBe("/marketing/brands/smart-add/company");
    expect(listProps?.headerActions).toBeUndefined();
  });
});
