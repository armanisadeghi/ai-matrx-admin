import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function QrLabelsPage() {
  return (
    <RouteIndexPage
      directory={join(process.cwd(), "app", "(authenticated)", "tests", "qr-labels")}
      basePath="/tests/qr-labels"
      title="QR Labels"
    />
  );
}
