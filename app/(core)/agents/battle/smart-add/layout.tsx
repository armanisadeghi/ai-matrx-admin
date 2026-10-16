import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/agents", {
  titlePrefix: "Smart Add",
  title: "Battle",
  description: "Name a brand you know; every system judges every search result against your truth.",
  letter: "BS",
});

export default function BattleSmartAddLayout({ children }: { children: React.ReactNode }) {
  return children;
}
