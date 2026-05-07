const TOTAL_LIFE_EXPECTANCY_BY_DECADE: Record<number, number> = {
  1900: 76.5,
  1910: 77.0,
  1920: 77.4,
  1930: 77.9,
  1940: 78.4,
  1950: 79.0,
  1960: 79.6,
  1970: 80.1,
  1980: 80.7,
  1990: 81.3,
  2000: 81.9,
  2010: 82.4,
  2020: 82.8,
};

export function totalLifeExpectancy(birthYear: number): number {
  const decade = Math.floor(birthYear / 10) * 10;
  const clamped = Math.max(1900, Math.min(2020, decade));
  return TOTAL_LIFE_EXPECTANCY_BY_DECADE[clamped] ?? 80;
}

export function currentAge(birthYear: number, today = new Date()): number {
  return today.getFullYear() - birthYear;
}

export function yearsRemaining(birthYear: number, today = new Date()): number {
  const total = totalLifeExpectancy(birthYear);
  const age = currentAge(birthYear, today);
  return Math.max(0, total - age);
}

export function birthYearOptions(): { label: string; value: string }[] {
  const currentYear = new Date().getFullYear();
  const startYear = 1900;
  const options: { label: string; value: string }[] = [];
  for (let y = currentYear; y >= startYear; y--) {
    options.push({ label: String(y), value: String(y) });
  }
  return options;
}
