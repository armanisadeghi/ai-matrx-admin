// The classic app menu as "Go to" entries, so every menu name is findable in the frame's palette
// too ("Zip Code Heatmap", "PR calendars"...). Built from nav-data with the same gating the classic
// menu uses: a guest sees `navItemsForViewer`'s rows (guestHidden dropped, guestHref swapped), the
// admin tree is added only for an admin. Rows that run an action or open a panel are not places,
// and an external row is not navigated by the palette, so both stay out.
import { adminNavItems, navItemsForViewer, primaryNavItems, settingsItem } from "@/features/shell/constants/nav-data";
import { buildMenuSearchIndex } from "@/features/shell/utils/menu-search";
import { MENU_GO_TO_PRODUCT_ID, type GoToEntry } from "@/features/shell/frame/goToIndex";

export function menuGoToEntries({ isAuthenticated, isAdmin }: { isAuthenticated: boolean; isAdmin: boolean }): GoToEntry[] {
  const items = [...navItemsForViewer(primaryNavItems, isAuthenticated), settingsItem, ...(isAdmin ? adminNavItems : [])];
  return buildMenuSearchIndex(items)
    .filter((e) => !e.action && !e.panelAction && !e.external && e.href.startsWith("/"))
    .map(({ id, label, trail, description, href, isCreate }) => ({
      id: `menu:${id}`,
      productId: MENU_GO_TO_PRODUCT_ID,
      label,
      trail,
      description,
      href,
      isCreate,
    }));
}
