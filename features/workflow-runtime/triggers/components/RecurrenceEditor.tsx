"use client";

/**
 * RecurrenceEditor — how a person who does not code says "every weekday at
 * 9 in the morning".
 *
 * A bare cron box is the thing this exists to avoid: the schedule is authored
 * in plain language, in the person's OWN timezone, and the cron expression is
 * derived (`toCron`). The expression is still shown — and still editable, one
 * click away under "Set it up myself" — because a power user must never be
 * locked out of what the platform can express. Anything typed there stays
 * verbatim (`fromCron` returns `advanced`), never rewritten.
 *
 * The next few real fire times are previewed with the platform's cron
 * primitives (`lib/scheduler-client/next-due.ts`), not a second parser.
 */

import { useMemo } from "react";

import { OptionCombobox, Select } from "@ai-matrx/design-system/controls";

import { nextNCronFires, validateCron } from "@/lib/scheduler-client/next-due";

import {
  DAY_NAMES,
  describeRecurrence,
  toCron,
  type Recurrence,
  type RecurrenceMode,
} from "../recurrence";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

const MODE_LABELS: Record<RecurrenceMode, string> = {
  daily: "Every day",
  weekdays: "Every weekday (Mon–Fri)",
  weekly: "Certain days of the week",
  monthly: "Once a month",
  hourly: "Every few hours",
  advanced: "Set it up myself",
};

const MODE_ORDER: RecurrenceMode[] = [
  "daily",
  "weekdays",
  "weekly",
  "monthly",
  "hourly",
  "advanced",
];

const COMMON_TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function allTimezones(current: string): string[] {
  const out = new Set<string>([current, browserTimezone(), ...COMMON_TIMEZONES]);
  const supported = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };
  try {
    for (const zone of supported.supportedValuesOf?.("timeZone") ?? []) {
      out.add(zone);
    }
  } catch {
    // Older engine — the common list above is the whole menu.
  }
  return [...out];
}

/** "24" → the two selects a person actually reads. */
function TimeOfDayPicker({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  const isPm = hour >= 12;
  const display = hour % 12 === 0 ? 12 : hour % 12;
  const setDisplay = (next: number) => {
    const base = next % 12;
    onChange(isPm ? base + 12 : base, minute);
  };
  return (
    <div className="flex items-center gap-1.5">
      <Select
        aria-label="Hour"
        value={String(display)}
        onValueChange={(v) => setDisplay(Number(v))}
        options={Array.from({ length: 12 }, (_, i) => i + 1).map((h) => ({
          value: String(h),
          label: String(h),
        }))}
      />
      <span className="text-muted-foreground">:</span>
      <Select
        aria-label="Minute"
        value={String(minute)}
        onValueChange={(v) => onChange(hour, Number(v))}
        options={[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => ({
          value: String(m),
          label: String(m).padStart(2, "0"),
        }))}
      />
      <Select<"AM" | "PM">
        aria-label="Morning or afternoon"
        value={isPm ? "PM" : "AM"}
        onValueChange={(v) => {
          const base = hour % 12;
          onChange(v === "PM" ? base + 12 : base, minute);
        }}
        options={[
          { value: "AM", label: "AM" },
          { value: "PM", label: "PM" },
        ]}
      />
    </div>
  );
}

export function RecurrenceEditor({
  recurrence,
  timezone,
  onRecurrenceChange,
  onTimezoneChange,
}: {
  recurrence: Recurrence;
  timezone: string;
  onRecurrenceChange: (next: Recurrence) => void;
  onTimezoneChange: (next: string) => void;
}) {
  const expression = toCron(recurrence);
  const cronError = expression ? validateCron(expression, timezone) : "Nothing set yet";
  const upcoming = useMemo(() => {
    if (!expression || cronError) return [];
    try {
      return nextNCronFires(expression, timezone, 3);
    } catch {
      return [];
    }
  }, [cronError, expression, timezone]);

  const hour = "hour" in recurrence ? recurrence.hour : 9;
  const minute = "minute" in recurrence ? recurrence.minute : 0;

  const setMode = (mode: RecurrenceMode) => {
    switch (mode) {
      case "daily":
        onRecurrenceChange({ mode, hour, minute });
        return;
      case "weekdays":
        onRecurrenceChange({ mode, hour, minute });
        return;
      case "weekly":
        onRecurrenceChange({ mode, days: [1], hour, minute });
        return;
      case "monthly":
        onRecurrenceChange({ mode, dayOfMonth: 1, hour, minute });
        return;
      case "hourly":
        onRecurrenceChange({ mode, everyHours: 6, minute });
        return;
      case "advanced":
        // Carry the derived expression across so nothing is lost when a
        // person opens the escape hatch to tweak what they already built.
        onRecurrenceChange({ mode, expression: expression || "0 9 * * *" });
        return;
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <span
                    className="text-xs font-medium text-muted-foreground"
        >
          How often should it run?
        </span>
        <Select<RecurrenceMode>
          value={recurrence.mode}
          onValueChange={setMode}
          aria-label="How often should it run?"
          className="mt-1 w-full max-w-sm"
          options={MODE_ORDER.map((mode) => ({
            value: mode,
            label: MODE_LABELS[mode],
          }))}
        />
      </div>

      {recurrence.mode === "weekly" ? (
        <fieldset>
          <legend className="text-xs font-medium text-muted-foreground">
            Which days?
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {DAY_NAMES.map((name, index) => {
              const on = recurrence.days.includes(index);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = on
                      ? recurrence.days.filter((d) => d !== index)
                      : [...recurrence.days, index];
                    onRecurrenceChange({
                      ...recurrence,
                      days: next.length > 0 ? next : [index],
                    });
                  }}
                  className={
                    on
                      ? "min-h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                      : "min-h-9 rounded-md border border-border px-3 text-sm text-foreground"
                  }
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {recurrence.mode === "monthly" ? (
        <div>
          <span
                        className="text-xs font-medium text-muted-foreground"
          >
            Which day of the month?
          </span>
          <Select
            value={String(recurrence.dayOfMonth)}
            onValueChange={(v) =>
              onRecurrenceChange({
                ...recurrence,
                dayOfMonth: Number(v),
              })
            }
            aria-label="Which day of the month?"
            className="mt-1 w-32"
            options={Array.from({ length: 28 }, (_, i) => i + 1).map((d) => ({
              value: String(d),
              label: String(d),
            }))}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Days 1–28 only, so it never skips a short month.
          </p>
        </div>
      ) : null}

      {recurrence.mode === "hourly" ? (
        <div>
          <span
                        className="text-xs font-medium text-muted-foreground"
          >
            Run it every…
          </span>
          <Select
            value={String(recurrence.everyHours)}
            onValueChange={(v) =>
              onRecurrenceChange({
                ...recurrence,
                everyHours: Number(v),
              })
            }
            aria-label="Run it every"
            className="mt-1 w-40"
            options={[1, 2, 3, 4, 6, 8, 12].map((h) => ({
              value: String(h),
              label: h === 1 ? "hour" : `${h} hours`,
            }))}
          />
        </div>
      ) : null}

      {recurrence.mode === "advanced" ? (
        <div>
          <label
            htmlFor="recurrence-cron"
            className="text-xs font-medium text-muted-foreground"
          >
            Schedule expression
          </label>
          <input
            id="recurrence-cron"
            value={recurrence.expression}
            onChange={(e) =>
              onRecurrenceChange({ mode: "advanced", expression: e.target.value })
            }
            placeholder="0 9 * * 1-5"
            maxLength={200}
            className="mt-1 block w-full max-w-sm rounded-md border border-border bg-background p-2 font-mono text-base"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Five fields: minute, hour, day of month, month, day of week.
          </p>
        </div>
      ) : (
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            {recurrence.mode === "hourly" ? "At which minute past the hour?" : "At what time?"}
          </span>
          <div className="mt-1.5">
            {recurrence.mode === "hourly" ? (
              <Select
                aria-label="Minutes past the hour"
                value={String(recurrence.minute)}
                onValueChange={(v) =>
                  onRecurrenceChange({
                    ...recurrence,
                    minute: Number(v),
                  })
                }
                options={[0, 15, 30, 45].map((m) => ({
                  value: String(m),
                  label: `${String(m).padStart(2, "0")} past`,
                }))}
              />
            ) : (
              <TimeOfDayPicker
                hour={hour}
                minute={minute}
                onChange={(h, m) =>
                  onRecurrenceChange({ ...recurrence, hour: h, minute: m } as Recurrence)
                }
              />
            )}
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="recurrence-tz"
          className="text-xs font-medium text-muted-foreground"
        >
          In which timezone?
        </label>
        <OptionCombobox
          id="recurrence-tz"
          value={timezone}
          onChange={onTimezoneChange}
          options={allTimezones(timezone)}
          getLabel={(zone) =>
            zone === browserTimezone() ? `${zone} (yours)` : zone
          }
          ariaLabel="In which timezone?"
          className="mt-1 w-full max-w-sm"
        />
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-2.5">
        {cronError ? (
          <p className="text-xs text-destructive">
            {recurrence.mode === "advanced"
              ? `That expression isn't valid: ${cronError}`
              : cronError}
            <ErrorAlchemyMenu error={cronError} />
          </p>
        ) : (
          <>
            <p className="text-xs font-medium text-foreground">
              {describeRecurrence(recurrence)}
            </p>
            {upcoming.length > 0 ? (
              <ul className="mt-1 space-y-0.5">
                {upcoming.map((iso) => (
                  <li key={iso} className="text-[11px] text-muted-foreground">
                    {formatInZone(iso, timezone)}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * An instant written the way the person set the schedule up.
 *
 * Pass the SCHEDULE's timezone for a future fire — that is the promise the
 * person authored ("every day at 9am, Tokyo time"). Pass nothing for a PAST
 * one: history is a moment the viewer is reading, so it belongs in the
 * viewer's own zone. A webhook trigger has no meaningful zone at all — its
 * stored `timezone` is just the "UTC" default — so its history read as
 * "8:11 AM UTC" to somebody for whom it was ten past one in the morning.
 */
export function formatInZone(iso: string, timezone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return date.toLocaleString(undefined, {
      timeZone: timezone ?? browserTimezone(),
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return date.toLocaleString();
  }
}
