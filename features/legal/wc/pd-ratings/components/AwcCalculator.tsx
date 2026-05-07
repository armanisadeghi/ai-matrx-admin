"use client";

import * as React from "react";
import { BarChart3, DollarSign, CalendarRange } from "lucide-react";
import { CalculatorShell } from "./CalculatorShell";
import { DualResultDisplay } from "./ResultDisplay";
import { EmptyResult } from "./EmptyResult";
import { Field, NumberField } from "./FormField";
import { averageWeeklyComp, formatCurrency } from "../lib/formulas";

export function AwcCalculator() {
  const [weeksWorked, setWeeksWorked] = React.useState<string>("52");
  const [totalEarned, setTotalEarned] = React.useState<string>("60000");

  const weeks = Number(weeksWorked) || 0;
  const earned = Number(totalEarned) || 0;
  const hasInputs = weeks > 0 && earned > 0;

  const { awc, rate } = hasInputs
    ? averageWeeklyComp(weeks, earned)
    : { awc: 0, rate: 0 };

  return (
    <CalculatorShell
      icon={BarChart3}
      title="Average Weekly Compensation"
      description="Average weekly earnings and the estimated 2/3 compensation rate used to calculate temporary and permanent disability benefits."
      inputs={
        <div className="space-y-5">
          <Field label="Weeks worked" hint="Typically 52 weeks (one year).">
            <NumberField
              value={weeksWorked}
              onChange={setWeeksWorked}
              prefix={<CalendarRange className="h-4 w-4" />}
              placeholder="52"
              min={1}
              max={104}
              step={1}
              inputMode="numeric"
            />
          </Field>

          <Field label="Total amount earned">
            <NumberField
              value={totalEarned}
              onChange={setTotalEarned}
              prefix={<DollarSign className="h-4 w-4" />}
              placeholder="60,000.00"
              min={0}
              step={0.01}
            />
          </Field>

          <div className="rounded-lg bg-muted/40 border border-border/60 p-3.5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              The 2/3 rate is the estimated weekly compensation rate. Actual
              California rates are subject to statutory minimums and maximums
              that change yearly.
            </p>
          </div>
        </div>
      }
      result={
        hasInputs ? (
          <DualResultDisplay
            primary={{
              label: "Average Weekly Comp",
              value: formatCurrency(awc),
            }}
            secondary={{
              label: "Estimated rate (2/3)",
              value: formatCurrency(rate),
            }}
          />
        ) : (
          <EmptyResult />
        )
      }
    />
  );
}
