// header-variants/index.ts
// Barrel exports — import from "@/app/(ssr)/_components/header-variants"

// Types
export type { HeaderAction, HeaderOption, HeaderDropdownOption } from "./types";

// Shared primitives
export { default as GlassButton } from "./shared/GlassButton";
export { default as LucideIcon } from "./shared/LucideIcon";
export { default as HeaderBack } from "./shared/HeaderBack";
export { default as HeaderActions } from "./shared/HeaderActions";
export { default as BottomSheet } from "./shared/BottomSheet";
export { default as GlassDropdown } from "./shared/GlassDropdown";

// Variant components (these go inside <PageHeader>)
export { default as HeaderStructured } from "./variants/HeaderStructured";
export { default as HeaderToggle } from "./variants/HeaderToggle";
export { default as HeaderIconTitle } from "./variants/HeaderIconTitle";
export { default as HeaderPills } from "./variants/HeaderPills";
export { default as HeaderTabs } from "./variants/HeaderTabs";
