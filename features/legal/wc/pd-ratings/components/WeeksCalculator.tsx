"use client";

import * as React from "react";
import { CalendarRange, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { CalculatorShell } from "./CalculatorShell";
import { ResultDisplay } from "./ResultDisplay";
import { EmptyResult } from "./EmptyResult";
import { Field, NumberField } from "./FormField";
import {
  endDateFromWeeks,
  formatNumber,
  weeksBetween,
} from "../lib/formulas";
import type { WeeksMode } from "../types";

export function WeeksCalculator() {
  const [mode, setMode] = React.useState<WeeksMode>("calculate-weeks");
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | undefined>();
  const [weeksInput, setWeeksInput] = React.useState<string>("12");

  const computedWeeks =
    mode === "calculate-weeks" && startDate && endDate
      ? weeksBetween(startDate, endDate)
      : null;

  const computedEndDate =
    mode === "calculate-end-date" && startDate && Number(weeksInput) > 0
      ? endDateFromWeeks(startDate, Number(weeksInput))
      : null;

  const hasResult =
    (mode === "calculate-weeks" && computedWeeks !== null) ||
    (mode === "calculate-end-date" && computedEndDate !== null);

  const days =
    computedWeeks !== null
      ? Math.round(computedWeeks * 7)
      : Number(weeksInput) > 0
        ? Math.round(Number(weeksInput) * 7)
        : 0;

  const months =
    computedWeeks !== null
      ? computedWeeks / 4.345
      : Number(weeksInput) > 0
        ? Number(weeksInput) / 4.345
        : 0;

  return (
    <CalculatorShell
      icon={CalendarRange}
      title="Number of Weeks"
      description="Calculate weeks between two dates, or determine an end date from a start date and number of weeks."
      inputs={
        <div className="space-y-5">
          <ModeToggle mode={mode} onChange={setMode} />

          <Field label="Start date">
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              formatString="MM/dd/yyyy"
              placeholder="mm/dd/yyyy"
              className="w-full justify-start h-11 text-base"
            />
          </Field>

          {mode === "calculate-weeks" ? (
            <Field label="End date">
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                formatString="MM/dd/yyyy"
                placeholder="mm/dd/yyyy"
                className="w-full justify-start h-11 text-base"
              />
            </Field>
          ) : (
            <Field
              label="Number of weeks"
              hint="Decimals are accepted (e.g., 12.5)."
            >
              <NumberField
                value={weeksInput}
                onChange={setWeeksInput}
                placeholder="12"
                min={0}
                step={0.5}
              />
            </Field>
          )}
        </div>
      }
      result={
        hasResult ? (
          mode === "calculate-weeks" ? (
            <ResultDisplay
              label="Weeks between dates"
              value={formatNumber(computedWeeks!, 2)}
              caption={`${format(startDate!, "MMM d, yyyy")} → ${format(
                endDate!,
                "MMM d, yyyy",
              )}`}
              stats={[
                { label: "Days", value: String(days) },
                { label: "Months", value: formatNumber(months, 1) },
                {
                  label: "Years",
                  value: formatNumber(computedWeeks! / 52, 2),
                },
              ]}
            />
          ) : (
            <ResultDisplay
              label="End date"
              value={format(computedEndDate!, "MMM d, yyyy")}
              caption={`${formatNumber(Number(weeksInput), 2)} weeks from ${format(
                startDate!,
                "MMM d, yyyy",
              )}`}
              stats={[
                { label: "Days", value: String(days) },
                { label: "Months", value: formatNumber(months, 1) },
                {
                  label: "Years",
                  value: formatNumber(Number(weeksInput) / 52, 2),
                },
              ]}
            />
          )
        ) : (
          <EmptyResult
            message={
              mode === "calculate-weeks"
                ? "Select both dates to calculate weeks"
                : "Select a start date and enter weeks"
            }
          />
        )
      }
    />
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: WeeksMode;
  onChange: (mode: WeeksMode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 w-full">
      <ModeButton
        active={mode === "calculate-weeks"}
        onClick={() => onChange("calculate-weeks")}
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Two dates → weeks
      </ModeButton>
      <ModeButton
        active={mode === "calculate-end-date"}
        onClick={() => onChange("calculate-end-date")}
      >
        <ArrowRightLeft className="h-3.5 w-3.5 rotate-180" />
        Start + weeks → end date
      </ModeButton>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
        active
          ? "bg-card text-foreground shadow-sm border border-border"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
