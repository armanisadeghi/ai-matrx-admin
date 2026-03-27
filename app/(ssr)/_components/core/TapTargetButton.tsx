import { forwardRef } from "react";

interface TapTargetButtonProps {
  icon?: React.ReactNode;
  children?: React.ReactNode;
  strokeWidth?: number;
  onClick?: () => void;
  className?: string;
  as?: "button" | "label";
  htmlFor?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

interface TapTargetButtonSolidProps extends TapTargetButtonProps {
  bgColor?: string;
  iconColor?: string;
  hoverBgColor?: string;
}

function IconContent({
  icon,
  children,
  strokeWidth = 2,
  className,
}: Pick<
  TapTargetButtonProps,
  "icon" | "children" | "strokeWidth" | "className"
>) {
  if (icon) return <>{icon}</>;
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    >
      {children}
    </svg>
  );
}

export function TapTargetButton({
  icon,
  children,
  strokeWidth = 2,
  onClick,
  className,
  as = "button",
  htmlFor,
  ariaLabel,
  disabled,
}: TapTargetButtonProps) {
  const color = className ?? "text-foreground";
  const Tag = as;
  return (
    <Tag
      onClick={onClick}
      htmlFor={htmlFor}
      aria-label={ariaLabel}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center bg-transparent transition-transform active:scale-95 group outline-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full matrx-shell-glass transition-colors">
        <IconContent
          icon={icon}
          strokeWidth={strokeWidth}
          className={`w-4 h-4 ${color}`}
        >
          {children}
        </IconContent>
      </div>
    </Tag>
  );
}

export const TapTargetButtonTransparent = forwardRef<
  HTMLButtonElement,
  TapTargetButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function TapTargetButtonTransparent(
  { icon, children, strokeWidth = 2, onClick, className, ariaLabel, disabled, ...rest },
  ref,
) {
  const color = className ?? "text-foreground";
  return (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      {...rest}
      className="flex h-11 w-11 items-center justify-center bg-transparent transition-transform active:scale-95 group outline-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
    >
      <div className="flex h-8 w-8 items-center justify-center hover:bg-muted rounded-full transition-colors">
        <IconContent
          icon={icon}
          strokeWidth={strokeWidth}
          className={`w-4 h-4 ${color}`}
        >
          {children}
        </IconContent>
      </div>
    </button>
  );
});

export const TapTargetButtonSolid = forwardRef<
  HTMLButtonElement,
  TapTargetButtonSolidProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function TapTargetButtonSolid(
  {
    icon,
    children,
    strokeWidth = 2,
    onClick,
    ariaLabel,
    disabled,
    bgColor = "bg-primary",
    iconColor = "text-primary-foreground",
    hoverBgColor = "hover:bg-primary/80",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      {...rest}
      className="flex h-11 w-11 items-center justify-center bg-transparent transition-transform active:scale-95 group outline-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${bgColor} ${hoverBgColor}`}>
        <IconContent
          icon={icon}
          strokeWidth={strokeWidth}
          className={`w-4 h-4 ${iconColor}`}
        >
          {children}
        </IconContent>
      </div>
    </button>
  );
});

export function TapTargetButtonForGroup({
  icon,
  children,
  strokeWidth = 2,
  onClick,
  className,
  ariaLabel,
  disabled,
}: TapTargetButtonProps) {
  const color = className ?? "text-foreground";
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center bg-transparent group outline-none disabled:opacity-40 disabled:pointer-events-none"
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full matrx-glass-interactive transition-[background,transform] active:scale-95">
        <IconContent
          icon={icon}
          strokeWidth={strokeWidth}
          className={`w-4 h-4 ${color}`}
        >
          {children}
        </IconContent>
      </div>
    </button>
  );
}

export function TapTargetButtonGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `relative inline-flex h-9 items-center ${className}` : "relative inline-flex h-9 items-center"}>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 rounded-full matrx-glass-thin-border" />
      <div className="relative flex items-center">{children}</div>
    </div>
  );
}
