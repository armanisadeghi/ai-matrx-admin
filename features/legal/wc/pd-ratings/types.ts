export type CalculatorId =
  | "ppd"
  | "present-value"
  | "weeks"
  | "life-expectancy"
  | "awc";

export type BodyPart = {
  value: string;
  label: string;
  maxWeeks: number;
  group: "Upper Extremity" | "Lower Extremity" | "Vision & Hearing" | "Spine & Trunk" | "Other";
};

export type WeeksMode = "calculate-weeks" | "calculate-end-date";
