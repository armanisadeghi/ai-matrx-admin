/**
 * features/files/components/surfaces/index.ts
 *
 * Surface barrel — drop-in hosts for every consumption context.
 */

export { PageShell } from "./PageShell";
export type { PageShellProps } from "./PageShell";

export { OnboardingEmptyState } from "./OnboardingEmptyState";
export type { OnboardingEmptyStateProps } from "./OnboardingEmptyState";

export {
  WindowPanelShell,
} from "./WindowPanelShell";
export type {
  WindowPanelShellProps,
  CloudFilesWindowTab,
} from "./WindowPanelShell";

export { MobileStack } from "./MobileStack";
export type { MobileStackProps } from "./MobileStack";

export { EmbeddedShell } from "./EmbeddedShell";
export type { EmbeddedShellProps } from "./EmbeddedShell";

export {
  PickerShell,
  DialogShell,
  DrawerShell,
} from "./PickerShell";
export type {
  PickerShellProps,
  PickerMode,
} from "./PickerShell";
