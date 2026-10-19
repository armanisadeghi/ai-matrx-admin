"use client";

// IconPicker — choose a row's icon from the shell's closed icon set (ShellIconName), never a free name.
import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button, SearchField } from "@ai-matrx/design-system/controls";
import ShellIcon from "@/features/shell/components/ShellIcon";
import { shellIconComponents, type ShellIconName } from "@/features/shell/shellIconMap";

const ALL_ICONS = Object.keys(shellIconComponents) as ShellIconName[];

/** "BarChart3" → "bar chart 3" (what a person types to find it). */
function words(name: string): string {
  return name.replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase();
}

export function IconPicker({ value, onChange, trigger }: { value: ShellIconName; onChange: (icon: ShellIconName) => void; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? ALL_ICONS.filter((name) => words(name).includes(q)) : ALL_ICONS;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? <Button variant="quiet" aria-label="Change icon" title="Change icon" icon={<ShellIcon name={value} />} />}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an icon" aria-label="Find an icon" />
        <div className="mt-2 grid max-h-64 grid-cols-8 gap-0.5 overflow-y-auto">
          {shown.map((name) => (
            <Button
              key={name}
              variant="quiet"
              pressed={name === value}
              aria-label={words(name)}
              title={words(name)}
              icon={<ShellIcon name={name} />}
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
            />
          ))}
        </div>
        {shown.length === 0 ? <p className="type-meta px-1 py-2 text-muted-foreground">No icon by that name</p> : null}
      </PopoverContent>
    </Popover>
  );
}
