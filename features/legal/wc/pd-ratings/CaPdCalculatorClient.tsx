"use client";

import * as React from "react";
import {
  Activity,
  TrendingUp,
  CalendarRange,
  HeartPulse,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PpdCalculator } from "./components/PpdCalculator";
import { PresentValueCalculator } from "./components/PresentValueCalculator";
import { WeeksCalculator } from "./components/WeeksCalculator";
import { LifeExpectancyCalculator } from "./components/LifeExpectancyCalculator";
import { AwcCalculator } from "./components/AwcCalculator";
import type { CalculatorId } from "./types";

type TabDef = {
  id: CalculatorId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
};

const TABS: TabDef[] = [
  {
    id: "ppd",
    label: "Permanent Partial Disability",
    shortLabel: "PPD",
    icon: Activity,
    description: "Total benefit and weeks of payments by body part and impairment rating.",
  },
  {
    id: "present-value",
    label: "Present Value",
    shortLabel: "Present Value",
    icon: TrendingUp,
    description: "Lump-sum value of a stream of weekly payments at a discount rate.",
  },
  {
    id: "weeks",
    label: "Number of Weeks",
    shortLabel: "Weeks",
    icon: CalendarRange,
    description: "Weeks between two dates — or end date from a start date and weeks.",
  },
  {
    id: "life-expectancy",
    label: "Life Expectancy",
    shortLabel: "Life Expectancy",
    icon: HeartPulse,
    description: "Estimated remaining years from year of birth.",
  },
  {
    id: "awc",
    label: "Average Weekly Compensation",
    shortLabel: "AWC",
    icon: BarChart3,
    description: "Average weekly earnings and the 2/3 compensation rate.",
  },
];

export function CaPdCalculatorClient() {
  const [active, setActive] = React.useState<CalculatorId>("ppd");
  const isMobile = useIsMobile();

  return (
    <div className="h-[calc(100dvh-2.5rem)] flex flex-col overflow-hidden bg-background">
      <Hero />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
          {isMobile ? (
            <MobileSwitcher tabs={TABS} active={active} onChange={setActive} />
          ) : (
            <DesktopTabs tabs={TABS} active={active} onChange={setActive} />
          )}

          <div className="mt-6">
            {active === "ppd" && <PpdCalculator />}
            {active === "present-value" && <PresentValueCalculator />}
            {active === "weeks" && <WeeksCalculator />}
            {active === "life-expectancy" && <LifeExpectancyCalculator />}
            {active === "awc" && <AwcCalculator />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <header className="border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            California Workers&apos; Compensation
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Estimates only — not legal advice
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          Permanent Disability Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-foreground">
          Estimate benefits, present value, weeks of payment, and life
          expectancy for California PD claims. All five calculators in one
          place.
        </p>
      </div>
    </header>
  );
}

function DesktopTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: CalculatorId;
  onChange: (id: CalculatorId) => void;
}) {
  return (
    <Tabs
      value={active}
      onValueChange={(v) => onChange(v as CalculatorId)}
      className="w-full"
    >
      <TabsList className="h-auto w-full flex flex-wrap justify-start gap-1.5 bg-card/50 p-1.5 rounded-xl border border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 h-auto min-w-0",
                "bg-transparent hover:bg-muted text-muted-foreground",
                "data-[state=active]:bg-primary/10 data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                "dark:bg-transparent dark:hover:bg-muted dark:data-[state=active]:bg-primary/15",
                "transition-colors",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="text-sm font-medium">{tab.shortLabel}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-0">
          <div className="sr-only">{tab.label}</div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function MobileSwitcher({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: CalculatorId;
  onChange: (id: CalculatorId) => void;
}) {
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];
  const ActiveIcon = activeTab.icon;
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Calculator
      </label>
      <Select value={active} onValueChange={(v) => onChange(v as CalculatorId)}>
        <SelectTrigger className="h-12 text-base bg-card">
          <div className="flex items-center gap-2.5">
            <ActiveIcon className="h-4 w-4 text-primary" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <SelectItem key={tab.id} value={tab.id} className="text-base py-2.5">
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {tab.label}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
