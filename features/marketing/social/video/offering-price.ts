/** A saved price as the label reads it: "$189", "$55.50 per belt"; empty when no amount is stored. */
export function offeringPriceText(row: { price_amount?: number | string | null; price_currency?: string | null; price_unit?: string | null } | null): string {
  const amount = row?.price_amount;
  if (amount === null || amount === undefined || amount === "") return "";
  const symbol = row?.price_currency === "USD" ? "$" : row?.price_currency ? `${row.price_currency} ` : "";
  const text = Number(amount).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: Number(amount) % 1 === 0 ? 0 : 2 });
  return `${symbol}${text}${row?.price_unit ? ` per ${row.price_unit}` : ""}`;
}
