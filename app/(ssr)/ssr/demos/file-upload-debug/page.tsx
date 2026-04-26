import { createRouteMetadata } from "@/utils/route-metadata";
import { FileUploadDebugClient } from "./FileUploadDebugClient";

export const metadata = createRouteMetadata("/ssr/demos/file-upload-debug", {
  titlePrefix: "File Upload Debug",
  title: "Demo",
  description:
    "Exhaustive harness for every file-upload pattern in the app. Shows the raw error from each attempt so we can pinpoint why uploads fail.",
  letter: "FU",
});

export default function FileUploadDebugPage() {
  return <FileUploadDebugClient />;
}
