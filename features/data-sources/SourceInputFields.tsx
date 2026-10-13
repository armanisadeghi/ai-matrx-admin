"use client";

/**
 * What to enter for a data source — the ONE input block the Data library's source panel and the
 * board's Get data tile both render. A source that can also be asked without a link (it has
 * `discover_options`: Google Maps places by keyword and country, products or jobs by keyword) gets
 * a "By link / By search" switch; "By search" shows that option's fields, each with its example.
 */

import { useEffect, useMemo, useState } from "react";
import { Button, OptionCombobox, SegmentedControl, Select } from "@ai-matrx/design-system/controls";

import { ProInput } from "@/components/official/ProInput";

import { inputFieldsFor, searchOptions, type DataSource } from "./contract";
import { countryName, countryOptions, defaultCountry, plainField, plainOption } from "./inputWords";

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
  // Technical ways of asking (a place number, a place ID) stay behind "More options" until asked for.
  const everyOption = options.map((o) => ({ ...o, ...plainOption(o.name) }));
  const everyday = everyOption.filter((o) => !o.advanced);
  const technical = everyOption.length - everyday.length;
  const [more, setMore] = useState(false);
  const usingTechnical = Boolean(current.option && everyOption.find((o) => o.name === current.option)?.advanced);
  const shownOptions = more || usingTechnical ? everyOption : everyday;
  const pickable = shownOptions.length > 0 ? shownOptions : everyOption;
  const homeCountry = useMemo(() => defaultCountry(), []);
  const countries = useMemo(() => countryOptions(homeCountry), [homeCountry]);
  const countryField = fields.find((f) => plainField(f).picker === "country");
  const needsCountry = Boolean(countryField && !values[countryField.name]);
  useEffect(() => {
    if (countryField && needsCountry) onValues({ ...values, [countryField.name]: homeCountry });
    // Only when the form first asks for a country (a source or option change), never while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryField?.name, current.option]);
  return (
    <div className="flex flex-col gap-3" data-source-input={current.mode}>
      {options.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<InputMode>
            aria-label="How to ask"
            value={current.mode}
            onValueChange={(next) => onOption(next === "link" ? null : (everyday[0] ?? everyOption[0]).name)}
            data={[
              { value: "link", label: "By link" },
              { value: "search", label: "By search" },
            ]}
          />
          {current.mode === "search" && pickable.length > 1 && (
            <Select
              aria-label="Search by"
              value={current.option ?? pickable[0].name}
              options={pickable.map((o) => ({ value: o.name, label: o.label }))}
              onValueChange={onOption}
            />
          )}
          {current.mode === "search" && technical > 0 && !more && !usingTechnical && (
            <Button type="button" variant="quiet" onClick={() => setMore(true)} data-more-options="">
              More options
            </Button>
          )}
        </div>
      )}
      {fields.map((f) => {
        const plain = plainField(f);
        const placeholder = plain.placeholder ?? (source.input.kind === "url" && current.mode === "link" ? (source.example_url ?? "https://") : "");
        return (
          <label key={f.name} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              {plain.label}
              {f.required ? "" : " (optional)"}
            </span>
            {plain.picker === "country" ? (
              <OptionCombobox
                ariaLabel={plain.label}
                value={values[f.name] || homeCountry}
                options={countries}
                getLabel={countryName}
                searchPlaceholder="Find a country"
                onChange={(code) => onValues({ ...values, [f.name]: code })}
              />
            ) : (
              <ProInput
                value={values[f.name] ?? ""}
                placeholder={placeholder}
                enableCleanup={false}
                enableVoice={searchOnly || current.mode === "search"}
                onChange={(e) => onValues({ ...values, [f.name]: e.target.value })}
                onBlur={onBlur}
                aria-label={plain.label}
                data-field={f.name}
              />
            )}
            {f.example && !values[f.name] && !plain.picker && (
              <Button type="button" variant="quiet" className="self-start" onClick={() => onValues({ ...values, [f.name]: f.example ?? "" })}>
                Use example
              </Button>
            )}
          </label>
        );
      })}
    </div>
  );
}
