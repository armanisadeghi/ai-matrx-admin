"use client";

/**
 * What to enter for a data source — the ONE input block the Data library's source panel and the
 * board's Get data tile both render. A source that can also be asked without a link (it has
 * `discover_options`: Google Maps places by keyword and country, products or jobs by keyword) gets
 * a "By link / By search" switch; "By search" shows that option's fields, each with its example.
 */

import { Button, SegmentedControl, Select } from "@ai-matrx/design-system/controls";

import { ProInput } from "@/components/official/ProInput";

import { inputFieldsFor, optionLabel, searchOptions, type DataSource } from "./contract";

export type InputMode = "link" | "search";

/** The mode and option a saved choice stands for: a named option that still exists, else the link. */
export function modeOf(source: Pick<DataSource, "input">, option: string | null | undefined): { mode: InputMode; option: string | null } {
  const options = searchOptions(source);
  const found = option ? options.find((o) => o.name === option) : null;
  return found ? { mode: "search", option: found.name } : { mode: "link", option: null };
}

export function SourceInputFields({
  source,
  values,
  option,
  onValues,
  onOption,
  onBlur,
}: {
  source: DataSource;
  values: Record<string, string>;
  /** The chosen search option's name; null = by link (or a source that only takes a search). */
  option: string | null;
  onValues: (next: Record<string, string>) => void;
  onOption: (next: string | null) => void;
  onBlur?: () => void;
}) {
  const options = searchOptions(source);
  const current = modeOf(source, option);
  const fields = inputFieldsFor(source, current.option);
  const searchOnly = source.input.kind === "keyword";
  return (
    <div className="flex flex-col gap-3" data-source-input={current.mode}>
      {options.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<InputMode>
            aria-label="How to ask"
            value={current.mode}
            onValueChange={(next) => onOption(next === "link" ? null : options[0].name)}
            data={[
              { value: "link", label: "By link" },
              { value: "search", label: "By search" },
            ]}
          />
          {current.mode === "search" && options.length > 1 && (
            <Select
              aria-label="Search by"
              value={current.option ?? options[0].name}
              options={options.map((o) => ({ value: o.name, label: optionLabel(o.name) }))}
              onValueChange={onOption}
            />
          )}
        </div>
      )}
      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {f.label}
            {f.required ? "" : " (optional)"}
          </span>
          <ProInput
            value={values[f.name] ?? ""}
            placeholder={f.example ?? (source.input.kind === "url" && current.mode === "link" ? (source.example_url ?? "https://") : "")}
            enableCleanup={false}
            enableVoice={searchOnly || current.mode === "search"}
            onChange={(e) => onValues({ ...values, [f.name]: e.target.value })}
            onBlur={onBlur}
            aria-label={f.label}
            data-field={f.name}
          />
          {f.example && !values[f.name] && (
            <Button type="button" variant="quiet" className="self-start" onClick={() => onValues({ ...values, [f.name]: f.example ?? "" })}>
              Use example
            </Button>
          )}
        </label>
      ))}
    </div>
  );
}
