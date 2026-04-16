"use client";

import { Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const SearchInput = ({
  ref,
  value,
  onChange,
  placeholder,
}: {
  ref?: React.Ref<HTMLInputElement>;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) => (
  <div className="flex items-center gap-1.5 h-7 px-2 rounded-md bg-muted/40 border border-border/50">
    <Search className="w-3 h-3 text-muted-foreground shrink-0" />
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none min-w-0"
      style={{ fontSize: "16px" }}
    />
    {value && (
      <button
        onClick={() => onChange("")}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="w-3 h-3" />
      </button>
    )}
  </div>
);

export function FilterChip({
  icon: Icon,
  label,
  active,
  focused,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  focused?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 h-6 px-1.5 rounded text-[11px] font-medium shrink-0 transition-colors",
        focused
          ? "bg-primary/15 text-primary border border-primary/30 ring-1 ring-primary/20"
          : active
            ? "bg-primary/10 text-primary border border-primary/20"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent",
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </button>
  );
}

export function OptionRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center w-full px-3 py-2 text-xs transition-colors",
        "hover:bg-muted/50 active:bg-muted/70",
        selected && "text-primary font-medium",
      )}
    >
      <span className="flex-1 text-left">{label}</span>
      {selected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
    </button>
  );
}

export function CheckRow({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted/50 active:bg-muted/70 transition-colors"
    >
      <div
        className={cn(
          "w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
          checked ? "bg-primary border-primary" : "border-muted-foreground/30",
        )}
      >
        {checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
      </div>
      <span className="flex-1 text-left truncate">{label}</span>
    </button>
  );
}

export function SidePanelHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
      <span className="text-xs font-semibold text-foreground">{title}</span>
      <button
        onClick={onClose}
        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
