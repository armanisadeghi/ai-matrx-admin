// The shape of the generated route table (route-homes.generated.ts). Plain data.

/** [section label or "", row label, route pattern, a live href for when the pattern has unknown params] */
export type FrameRouteItem = readonly [section: string, label: string, pattern: string, fallbackHref: string];
/** [pattern, product id, sidebar row index or -1, page title or ""] */
export type FrameRouteRow = readonly [pattern: string, productId: string, itemIndex: number, title: string];

export interface FrameRouteHomes {
  products: Readonly<Record<string, { entry: string; items: readonly FrameRouteItem[] }>>;
  routes: readonly FrameRouteRow[];
}

/** One "Go to" page: [pattern, product id ("menu" = account menu), title, path labels between product and page]. */
export type GoToPageRow = readonly [pattern: string, productId: string, title: string, trail: readonly string[]];
