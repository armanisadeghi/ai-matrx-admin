export function presentValue(
  weeklyPayment: number,
  numWeeks: number,
  annualRatePct: number,
): number {
  if (weeklyPayment <= 0 || numWeeks <= 0) return 0;
  const r = annualRatePct / 100 / 52;
  if (r === 0) return weeklyPayment * numWeeks;
  return weeklyPayment * ((1 - Math.pow(1 + r, -numWeeks)) / r);
}

const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;

export function weeksBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MS_PER_WEEK;
}

export function endDateFromWeeks(start: Date, weeks: number): Date {
  return new Date(start.getTime() + weeks * MS_PER_WEEK);
}

export function ppdBenefit(
  weeklyPayment: number,
  impairmentPct: number,
  bodyPartMaxWeeks: number,
): { weeks: number; total: number } {
  const weeks = bodyPartMaxWeeks * (impairmentPct / 100);
  const total = weeks * weeklyPayment;
  return { weeks, total };
}

export function averageWeeklyComp(
  weeksWorked: number,
  totalEarned: number,
): { awc: number; rate: number } {
  if (weeksWorked <= 0) return { awc: 0, rate: 0 };
  const awc = totalEarned / weeksWorked;
  return { awc, rate: awc * (2 / 3) };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
