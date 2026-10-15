// Checks for area "platform" (owner REGRESSION-BAR).
export default [
  {
    id: "platform.walk-platform",
    area: "platform",
    kind: "walk",
    file: "scripts/regression-bar/walks/platform.mjs",
    walkName: "platform",
    items: ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09"],
    targets: ["live", "clone"],
  },
];
