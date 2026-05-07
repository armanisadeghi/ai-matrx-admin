"use client";

import * as React from "react";
import { TrendingUp, DollarSign, Percent, CalendarRange } from "lucide-react";
import { CalculatorShell } from "./CalculatorShell";
import { ResultDisplay } from "./ResultDisplay";
import { EmptyResult } from "./EmptyResult";
import { Field, NumberField } from "./FormField";
import {
  formatCurrency,
  formatNumber,
  presentValue,
} from "../lib/formulas";

export function PresentValueCalculator() {
  const [weeklyPayment, setWeeklyPayment] = React.useState<string>("500");
  const [numWeeks, setNumWeeks] = React.useState<string>("100");
  const [interestRate, setInterestRate] = React.useState<string>("2");

  const pmt = Number(weeklyPayment) || 0;
  const n = Number(numWeeks) || 0;
  const r = Number(interestRate) || 0;
  const hasInputs = pmt > 0 && n > 0;

  const pv = hasInputs ? presentValue(pmt, n, r) : 0;
  const undiscounted = pmt * n;
  const discount = undiscounted - pv;

  return (
    <CalculatorShell
      icon={TrendingUp}
      title="Present Value"
      description="The lump-sum value today of a stream of future weekly payments, discounted at a given annual rate."
      inputs={
        <div className="space-y-5">
          <Field label="Weekly payment amount">
            <NumberField
              value={weeklyPayment}
              onChange={setWeeklyPayment}
              prefix={<DollarSign className="h-4 w-4" />}
              placeholder="500.00"
              min={0}
              step={0.01}
            />
          </Field>

          <Field label="Number of weeks">
            <NumberField
              value={numWeeks}
              onChange={setNumWeeks}
              prefix={<CalendarRange className="h-4 w-4" />}
              placeholder="100"
              min={0}
              step={1}
            />
          </Field>

          <Field
            label="Annual interest rate"
            hint="Used to discount future payments to today's value."
          >
            <NumberField
              value={interestRate}
              onChange={setInterestRate}
              suffix={<Percent className="h-4 w-4" />}
              placeholder="2"
              min={0}
              max={50}
              step={0.1}
            />
          </Field>
        </div>
      }
      result={
        hasInputs ? (
          <ResultDisplay
            label="Present value"
            value={formatCurrency(pv)}
            caption={`Discounted at ${formatNumber(r, 2)}% annual interest`}
            stats={[
              {
                label: "Total payments",
                value: formatCurrency(undiscounted),
              },
              {
                label: "Discount amount",
                value: formatCurrency(discount),
              },
              {
                label: "Discount %",
                value:
                  undiscounted > 0
                    ? `${formatNumber((discount / undiscounted) * 100, 2)}%`
                    : "—",
              },
            ]}
          />
        ) : (
          <EmptyResult />
        )
      }
    />
  );
}
