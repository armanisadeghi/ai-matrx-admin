/**
 * The web app's copy bar and read-state notices, handed to
 * `@ai-matrx/content-ir/kind-kit`'s host slots. Import for its side
 * effect from every module that renders kit components (the stored-code
 * scope and the app's own kind blocks) — never from app boot.
 *
 * Each slot loads its app module only when a kit component first RENDERS
 * one, never at registration: registering must cost nothing, and in the kind
 * sandbox frame the copy bar's module graph must not run until a component
 * actually shows a copy bar (that is when it ran before the kit moved). The
 * frame bundle's esbuild aliases swap these modules for the frame-safe twins.
 */
import { createElement } from "react";
import {
  setKindKitHost,
  type KindKitCopyProps,
  type KindKitReadEmptyProps,
  type KindKitReadStaleNoticeProps,
  type KindImageProps,
  type KindVideoProps,
  type KindAudioProps,
  type KindEmbedProps,
} from "@ai-matrx/content-ir/kind-kit";

function AppCopyButtons(props: KindKitCopyProps) {
  const { CopyButtons } = require("@/components/agent-copy/CopyButtons") as typeof import("@/components/agent-copy/CopyButtons");
  return createElement(CopyButtons, props);
}

function AppReadEmpty(props: KindKitReadEmptyProps) {
  const { ReadEmpty } = require("@ai-matrx/design-system") as typeof import("@ai-matrx/design-system");
  return createElement(ReadEmpty, props);
}

function AppReadStaleNotice(props: KindKitReadStaleNoticeProps) {
  const { ReadStaleNotice } = require("@ai-matrx/design-system") as typeof import("@ai-matrx/design-system");
  return createElement(ReadStaleNotice, props);
}

/** A shape's image: THE canonical image block (the frame bundle aliases this to its frame twin). */
function AppImage(props: KindImageProps) {
  const { AppKindImage } = require("@/features/content-ir/react/kind-image/AppKindImage") as typeof import("@/features/content-ir/react/kind-image/AppKindImage");
  return createElement(AppKindImage, props);
}

/** A shape's video / audio / embed: the canonical players (the frame bundle aliases the module to its frame twin). */
function AppVideo(props: KindVideoProps) {
  const { AppKindVideo } = require("@/features/content-ir/react/kind-media/AppKindMedia") as typeof import("@/features/content-ir/react/kind-media/AppKindMedia");
  return createElement(AppKindVideo, props);
}
function AppAudio(props: KindAudioProps) {
  const { AppKindAudio } = require("@/features/content-ir/react/kind-media/AppKindMedia") as typeof import("@/features/content-ir/react/kind-media/AppKindMedia");
  return createElement(AppKindAudio, props);
}
function AppEmbed(props: KindEmbedProps) {
  const { AppKindEmbed } = require("@/features/content-ir/react/kind-media/AppKindMedia") as typeof import("@/features/content-ir/react/kind-media/AppKindMedia");
  return createElement(AppKindEmbed, props);
}

setKindKitHost({
  CopyButtons: AppCopyButtons,
  ReadEmpty: AppReadEmpty,
  ReadStaleNotice: AppReadStaleNotice,
  Image: AppImage,
  Video: AppVideo,
  Audio: AppAudio,
  Embed: AppEmbed,
});
