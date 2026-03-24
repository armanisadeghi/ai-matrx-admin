import { join } from "path";
import { RouteIndexPage } from "@/components/ssr/RouteIndexPage";

export default async function VoicePage() {
  return (
    <RouteIndexPage
      directory={join(process.cwd(), "app", "(authenticated)", "demo", "voice")}
      basePath="/demo/voice"
      title="Voice"
    />
  );
}
