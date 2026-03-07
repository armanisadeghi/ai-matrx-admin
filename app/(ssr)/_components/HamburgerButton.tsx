import { TapTargetButton } from "./core/TapTargetButton";

export default function HamburgerButton({ className }: { className?: string }) {
  return (
    <div className={className ? `shell-mobile-trigger ${className}` : "shell-mobile-trigger"}>
      <TapTargetButton
        as="label"
        htmlFor="shell-mobile-menu"
        ariaLabel="Open navigation menu"
        strokeWidth={1.75}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </TapTargetButton>
    </div>
  );
}
