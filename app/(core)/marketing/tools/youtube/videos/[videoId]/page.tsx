// record-view: none — a video preview that hands off to the viewer, not a record page
import { YouTubeVideoPreviewPage } from "@/features/marketing/discovery/youtube/YouTubeVideoPreviewPage";

export default async function YouTubeDiscoveryVideoPage({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  return <YouTubeVideoPreviewPage videoId={videoId} />;
}
