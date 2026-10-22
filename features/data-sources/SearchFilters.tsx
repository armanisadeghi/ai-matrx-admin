"use client";

/**
 * The filters of a source's search (price, beds, baths, home type, for sale / rent / sold) as plain
 * controls. Only the filters the server lists for this source and organization (`search_filters`)
 * appear — a control that would do nothing is never drawn (`./filterChoices`). Values live in the
 * form's own `values` under the server's filter names, so a run, a refill and the plain-language
 * box all speak the same fields.
 */

import { SegmentedControl, Select } from "@ai-matrx/design-system/controls";

import { ProInput } from "@/components/official/ProInput";

import type { DataSource } from "./contract";
import {
  ANY,
  BATHS_CHOICES,
  BEDS_CHOICES,
  STATUS_CHOICES,
  bedsValue,
  homeTypeChoices,
  shownFilters,
  withBeds,
  withChoice,
  type FilterName,
} from "./filterChoices";

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function SearchFilters({
  source,
  values,
  onValues,
}: {
  source: Pick<DataSource, "search_filters">;
  values: Record<string, string>;
  onValues: (next: Record<string, string>) => void;
}) {
  const shown = shownFilters(source);
  if (shown.size === 0) return null;
  const set = (name: FilterName, value: string) => {
    const { [name]: _drop, ...rest } = values;
    onValues(value.trim() ? { ...rest, [name]: value } : rest);
  };
  const beds = bedsValue(values);
  const bedChoices = beds.startsWith("=") ? [...BEDS_CHOICES, { value: beds, label: `${beds.slice(1)} only` }] : BEDS_CHOICES;
  return (
    <div className="flex flex-col gap-3" data-search-filters="">
      {shown.has("status") && (
        <Labeled label="For sale or rent">
          <SegmentedControl
            aria-label="For sale or rent"
            value={values.status || "for_sale"}
            data={STATUS_CHOICES}
            onValueChange={(v) => onValues(withChoice(values, "status", v))}
          />
        </Labeled>
      )}
      {(shown.has("price_min") || shown.has("price_max")) && (
        <div className="grid grid-cols-2 gap-3">
          {shown.has("price_min") && (
            <Labeled label="Lowest price">
              <ProInput
                value={values.price_min ?? ""}
                placeholder="No minimum"
                enableCleanup={false}
                enableVoice={false}
                inputMode="numeric"
                onChange={(e) => set("price_min", e.target.value)}
                aria-label="Lowest price"
                data-field="price_min"
              />
            </Labeled>
          )}
          {shown.has("price_max") && (
            <Labeled label="Highest price">
              <ProInput
                value={values.price_max ?? ""}
                placeholder="No maximum"
                enableCleanup={false}
                enableVoice={false}
                inputMode="numeric"
                onChange={(e) => set("price_max", e.target.value)}
                aria-label="Highest price"
                data-field="price_max"
              />
            </Labeled>
          )}
        </div>
      )}
      {shown.has("beds_min") && (
        <Labeled label="Beds">
          <SegmentedControl aria-label="Beds" value={beds} data={bedChoices} onValueChange={(v) => onValues(withBeds(values, v))} />
        </Labeled>
      )}
      {shown.has("baths_min") && (
        <Labeled label="Baths">
          <SegmentedControl
            aria-label="Baths"
            value={values.baths_min || ANY}
            data={BATHS_CHOICES}
            onValueChange={(v) => onValues(withChoice(values, "baths_min", v))}
          />
        </Labeled>
      )}
      {shown.has("home_type") && (
        <Labeled label="Home type">
          <Select
            aria-label="Home type"
            value={values.home_type || ANY}
            options={homeTypeChoices(values.status)}
            onValueChange={(v) => onValues(withChoice(values, "home_type", v))}
          />
        </Labeled>
      )}
    </div>
  );
}
