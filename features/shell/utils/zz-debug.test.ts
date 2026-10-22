import { primaryNavItems, settingsItem, expandNavChildren } from "../constants/nav-data";
import { buildMenuSearchIndex } from "./menu-search";
it("dbg", () => {
  const labels = new Set(buildMenuSearchIndex([...primaryNavItems, settingsItem]).map((e) => e.label));
  const miss: string[] = [];
  for (const item of primaryNavItems) for (const c of expandNavChildren(item.children)) if (!labels.has(c.label)) miss.push(`${item.label} > ${c.label} ${c.href}`);
  console.log("MISSING", miss);
});
