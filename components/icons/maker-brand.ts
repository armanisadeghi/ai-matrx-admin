// Brand-name resolution lives in icons; tap buttons live in design-system.
// Keep this app-facing path so existing callers use the shared package implementations.
export {
  resolveMakerBrandId,
  type MakerBrandId,
} from "@ai-matrx/icons/brand-glyphs";
export { getMakerBrandTapButton } from "@ai-matrx/design-system/tap-target/ai-buttons";
