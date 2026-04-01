import {
  SaveTapButton,
  LoadingTapButton,
} from "@/components/icons/tap-buttons";

type Variant = "glass" | "transparent" | "solid" | "group";

interface CompositeButtonBaseProps {
  variant?: Variant;
  onClick?: () => void;
  as?: "button" | "label";
  htmlFor?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  strokeWidth?: number;
  bgColor?: string;
  iconColor?: string;
  hoverBgColor?: string;
}

// ---------------------------------------------------------------------------
// SaveOrLoadingTapButton
// Renders SaveTapButton when idle, LoadingTapButton (animated) when loading.
// ---------------------------------------------------------------------------

interface SaveOrLoadingTapButtonProps extends CompositeButtonBaseProps {
  isLoading?: boolean;
}

export function SaveOrLoadingTapButton({
  isLoading = false,
  ...props
}: SaveOrLoadingTapButtonProps) {
  if (isLoading) {
    return <LoadingTapButton {...props} disabled ariaLabel="Saving…" />;
  }
  return <SaveTapButton {...props} />;
}
