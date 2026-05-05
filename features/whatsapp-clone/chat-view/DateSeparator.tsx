interface DateSeparatorProps {
  label: string;
}

export function DateSeparator({ label }: DateSeparatorProps) {
  return (
    <div className="flex justify-center py-2">
      <span className="rounded-md bg-muted/85 px-3 py-1 text-[12px] font-medium uppercase tracking-wide text-muted-foreground shadow-sm">
        {label}
      </span>
    </div>
  );
}
