"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateFieldProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
  className?: string;
  id?: string;
}

const DISPLAY_FORMAT = "MM/dd/yyyy";

export function DateField({
  value,
  onChange,
  placeholder = "mm/dd/yyyy",
  disabled,
  fromYear = 1900,
  toYear,
  className,
  id,
}: DateFieldProps) {
  const today = React.useMemo(() => new Date(), []);
  const upperYear = toYear ?? today.getFullYear() + 5;
  const startMonth = React.useMemo(() => new Date(fromYear, 0, 1), [fromYear]);
  const endMonth = React.useMemo(() => new Date(upperYear, 11, 31), [upperYear]);

  const [text, setText] = React.useState<string>(() =>
    value ? format(value, DISPLAY_FORMAT) : "",
  );
  const [open, setOpen] = React.useState(false);
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Re-sync text when external value changes (e.g., calendar pick, parent reset).
  React.useEffect(() => {
    setText(value ? format(value, DISPLAY_FORMAT) : "");
  }, [value]);

  const commitText = React.useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed === "") {
        if (valueRef.current !== undefined) onChange(undefined);
        return;
      }
      const parsed = parse(trimmed, DISPLAY_FORMAT, new Date());
      if (
        isValid(parsed) &&
        parsed.getFullYear() >= fromYear &&
        parsed.getFullYear() <= upperYear
      ) {
        onChange(parsed);
      } else {
        // Revert to last committed value
        setText(valueRef.current ? format(valueRef.current, DISPLAY_FORMAT) : "");
      }
    },
    [fromYear, onChange, upperYear],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitText(text);
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setText(value ? format(value, DISPLAY_FORMAT) : "");
      e.currentTarget.blur();
    }
  };

  const clear = () => {
    setText("");
    onChange(undefined);
  };

  return (
    <div
      className={cn(
        "relative flex items-center w-full",
        "rounded-lg border border-border bg-background",
        "transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
        disabled && "opacity-60",
        className,
      )}
    >
      <CalendarIcon className="ml-3 h-4 w-4 text-muted-foreground shrink-0 pointer-events-none" />
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commitText(text)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "h-11 flex-1 min-w-0 bg-transparent text-base font-medium tabular-nums text-foreground",
          "placeholder:text-muted-foreground/60",
          "px-2.5",
          "outline-none",
          "disabled:cursor-not-allowed",
        )}
      />
      {text && !disabled && (
        <button
          type="button"
          onClick={clear}
          tabIndex={-1}
          aria-label="Clear date"
          className="mr-1 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Open calendar"
            className={cn(
              "mr-1 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
              "disabled:cursor-not-allowed",
            )}
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={endMonth}
            defaultMonth={value ?? new Date(today.getFullYear(), today.getMonth(), 1)}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
