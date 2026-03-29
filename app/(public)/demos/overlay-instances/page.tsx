import { OverlayInstancesDemo } from "./_components/OverlayInstancesDemo";

export const metadata = {
  title: "Instanced Overlay Demo",
  description:
    "Demonstrates the instanced overlay system: singleton and multi-instance markdown editors running simultaneously.",
};

export default function OverlayInstancesDemoPage() {
  return <OverlayInstancesDemo />;
}
