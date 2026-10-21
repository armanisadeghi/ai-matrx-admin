/**
 * Frame twin of `AppKindMedia` (aliased in build-kind-sandbox.ts): no app player can run in the
 * sandbox frame (no network, no frame-src), so a shape's video, audio and embed are the kit's own
 * frame-safe defaults — a poster card whose Play asks the host through runAction: `load_media` for a
 * saved file (the host fetches the bytes, the frame plays them from a blob: URL, `media-src blob:`),
 * `play_embed` for a web address or provider link (the host opens the real player in a window).
 */
import {
  DefaultKindAudio,
  DefaultKindEmbed,
  DefaultKindVideo,
  type KindAudioProps,
  type KindEmbedProps,
  type KindVideoProps,
} from "@ai-matrx/content-ir/kind-kit";

export function AppKindVideo(props: KindVideoProps) {
  return <DefaultKindVideo {...props} />;
}
export function AppKindAudio(props: KindAudioProps) {
  return <DefaultKindAudio {...props} />;
}
export function AppKindEmbed(props: KindEmbedProps) {
  return <DefaultKindEmbed {...props} />;
}
