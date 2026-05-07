"use client";

import * as React from "react";
import { Activity, DollarSign, Percent } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { CalculatorShell } from "./CalculatorShell";
import { ResultDisplay } from "./ResultDisplay";
import { EmptyResult } from "./EmptyResult";
import { Field, NumberField } from "./FormField";
import { BODY_PARTS } from "../lib/body-parts";
import {
  formatCurrency,
  formatNumber,
  ppdBenefit,
} from "../lib/formulas";
import type { BodyPart } from "../types";

const BODY_PART_GROUPS: Record<string, BodyPart[]> = BODY_PARTS.reduce(
  (acc, part) => {
    acc[part.group] = acc[part.group] ?? [];
    acc[part.group].push(part);
    return acc;
  },
  {} as Record<string, BodyPart[]>,
);

export function PpdCalculator() {
  const [bodyPartValue, setBodyPartValue] = React.useState<string>("arm");
  const [weeklyPayment, setWeeklyPayment] = React.useState<string>("750");
  const [impairment, setImpairment] = React.useState<number>(15);

  const selectedPart = BODY_PARTS.find((p) => p.value === bodyPartValue);

  const weeklyNum = Number(weeklyPayment) || 0;
  const hasInputs =
    selectedPart !== undefined && weeklyNum > 0 && impairment > 0;

  const { weeks, total } = hasInputs
    ? ppdBenefit(weeklyNum, impairment, selectedPart!.maxWeeks)
    : { weeks: 0, total: 0 };

  return (
    <CalculatorShell
      icon={Activity}
      title="Permanent Partial Disability"
      description="Calculate total benefit and weeks of payments based on the affected body part and impairment rating."
      inputs={
        <div className="space-y-5">
          <Field
            label="Body part"
            hint={
              selectedPart
                ? `Maximum benefit: ${selectedPart.maxWeeks} weeks`
                : undefined
            }
          >
            <Select value={bodyPartValue} onValueChange={setBodyPartValue}>
              <SelectTrigger className="h-11 text-base bg-background">
                <SelectValue placeholder="Select body part" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {Object.entries(BODY_PART_GROUPS).map(([group, parts]) => (
                  <SelectGroup key={group}>
                    <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                      {group}
                    </SelectLabel>
                    {parts.map((part) => (
                      <SelectItem
                        key={part.value}
                        value={part.value}
                        className="text-base"
                      >
                        <span className="flex items-center justify-between w-full gap-3">
                          <span>{part.label}</span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {part.maxWeeks} wks
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Weekly payment amount"
            hint="The injured worker's weekly compensation rate."
          >
            <NumberField
              value={weeklyPayment}
              onChange={setWeeklyPayment}
              prefix={<DollarSign className="h-4 w-4" />}
              placeholder="750.00"
              min={0}
              step={0.01}
            />
          </Field>

          <Field
            label="Impairment rating"
            trailing={
              <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
                {impairment}%
              </span>
            }
            hint="Whole-person impairment rating from the medical evaluation."
          >
            <div className="flex items-center gap-3">
              <Slider
                value={[impairment]}
                onValueChange={(v) => setImpairment(v[0] ?? 0)}
                min={0}
                max={100}
                step={1}
                className="flex-1"
              />
              <div className="w-24">
                <NumberField
                  value={String(impairment)}
                  onChange={(v) => {
                    const n = Number(v);
                    if (!Number.isNaN(n)) {
                      setImpairment(Math.max(0, Math.min(100, n)));
                    }
                  }}
                  suffix={<Percent className="h-3.5 w-3.5" />}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          </Field>
        </div>
      }
      result={
        hasInputs ? (
          <ResultDisplay
            label="Total benefit"
            value={formatCurrency(total)}
            caption={`Paid over ${formatNumber(weeks, 2)} weeks at ${formatCurrency(
              weeklyNum,
            )}/week`}
            stats={[
              {
                label: "Weeks of payments",
                value: formatNumber(weeks, 2),
              },
              {
                label: "Impairment rating",
                value: `${impairment}%`,
              },
              {
                label: "Body part max",
                value: `${selectedPart!.maxWeeks} wks`,
              },
            ]}
          />
        ) : (
          <EmptyResult message="Select a body part and enter values" />
        )
      }
    />
  );
}
