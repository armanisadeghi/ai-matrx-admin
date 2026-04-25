import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Socket User",
  title: "Demo",
  description: "Socket user concept and admin UI demo.",
  letter: "UC", // User concept
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
