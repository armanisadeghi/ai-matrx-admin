import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demo", {
  titlePrefix: "Floating Slider",
  title: "Demo",
  description: "Floating slider dock interaction demo.",
  letter: "Fv", // Floating slider
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
