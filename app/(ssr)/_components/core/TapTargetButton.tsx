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
  bgColor?: string; // Tailwind bg class e.g. "bg-primary", "bg-blue-600"
  iconColor?: string; // Tailwind text class e.g. "text-white"
  hoverBgColor?: string; // Tailwind hover bg class e.g. "hover:bg-primary/80"
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

export function TapTargetButtonTransparent({
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
      <div className="flex h-8 w-8 items-center justify-center hover:bg-muted rounded-full transition-colors">
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

export function TapTargetButtonSolid({
  icon,
  children,
  strokeWidth = 2,
  onClick,
  as = "button",
  htmlFor,
  ariaLabel,
  disabled,
  bgColor = "bg-primary",
  iconColor = "text-primary-foreground",
  hoverBgColor = "hover:bg-primary/80",
}: TapTargetButtonSolidProps) {
  const Tag = as;
  return (
    <Tag
      onClick={onClick}
      htmlFor={htmlFor}
      aria-label={ariaLabel}
      disabled={disabled}
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
    </Tag>
  );
}

export function TapTargetButtonForGroup({
  icon,
  children,
  strokeWidth = 2,
  onClick,
  className,
}: TapTargetButtonProps) {
  const color = className ?? "text-foreground";
  return (
    <button
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center bg-transparent group outline-none"
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
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-11 items-center">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 rounded-full matrx-glass-thin-border" />
      <div className="relative flex items-center">{children}</div>
    </div>
  );
}
