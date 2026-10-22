"use client";

/**
 * What to enter for a data source — the ONE input block the Data library's source panel and the
 * board's Get data tile both render. SEARCH FIRST (owner, 2026-10-22): a source opens on what a
 * person knows — plain search fields ("Where", "For sale or rent"), or a name box for a link-only
 * source (company, app, @handle → its page, through compare's one lookup). The page address and the
 * technical ways of asking (a place ID, a category page) sit under "Advanced".
 */

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button, OptionCombobox, Select } from "@ai-matrx/design-system/controls";

import { ProInput } from "@/components/official/ProInput";

import { inputFieldsFor, searchOptions, type DataSource, type DataSourceField } from "./contract";
import { countryName, countryOptions, defaultCountry, plainField, plainOption } from "./inputWords";
import { NameFinder } from "./NameFinder";
import { nameFinderFor } from "./nameFinders";

export type InputMode = "link" | "search";

/** The saved choice "ask by the page address" (the link under Advanced) — never a provider option name. */
export const LINK_OPTION = "@link";

/**
 * The mode and option a saved choice stands for. A named option that still exists is that search;
 * `LINK_OPTION`, or a link already in the values, is the link; nothing chosen opens on the source's
 * first everyday search (search first), else the link (a link-only source; its name box fills it).
 */
export function modeOf(
  source: Pick<DataSource, "input">,
  option: string | null | undefined,
  values?: Record<string, string> | null,
): { mode: InputMode; option: string | null } {
  const options = searchOptions(source);
  const found = option ? options.find((o) => o.name === option) : null;
  if (found) return { mode: "search", option: found.name };
  if (option === LINK_OPTION || values?.url?.trim()) return { mode: "link", option: null };
  const everyday = options.find((o) => !plainOption(o.name).advanced && !o.fields.some((f) => plainField(f).advanced));
  return everyday ? { mode: "search", option: everyday.name } : { mode: "link", option: null };
}

function FieldBox({
  f,
  sourceKey,
  values,
  onValues,
  onBlur,
  placeholder,
  homeCountry,
  countries,
  voice,
}: {
  f: DataSourceField;
  sourceKey: string;
  values: Record<string, string>;
  onValues: (next: Record<string, string>) => void;
  onBlur?: () => void;
  placeholder: string;
  homeCountry: string;
  countries: string[];
  voice: boolean;
}) {
  const plain = plainField(f, sourceKey);
  return (
    <label className="flex flex-col gap-1">
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
      ) : plain.choices ? (
        <Select
          aria-label={plain.label}
          value={values[f.name] || plain.choices[0].value}
          options={plain.choices}
          onValueChange={(v) => onValues({ ...values, [f.name]: v })}
        />
      ) : (
        <ProInput
          value={values[f.name] ?? ""}
          placeholder={placeholder}
          enableCleanup={false}
          enableVoice={voice}
          onChange={(e) => onValues({ ...values, [f.name]: e.target.value })}
          onBlur={onBlur}
          aria-label={plain.label}
          data-field={f.name}
        />
      )}
      {f.example && !values[f.name] && !plain.picker && !plain.choices && (
        <Button type="button" variant="quiet" className="self-start" onClick={() => onValues({ ...values, [f.name]: f.example ?? "" })}>
          Use example
        </Button>
      )}
    </label>
  );
}

export function SourceInputFields({
  source,
  values,
  option,
  onValues,
  onOption,
  onBlur,
  organizationId,
}: {
  source: DataSource;
  values: Record<string, string>;
  /** The chosen search option's name, `LINK_OPTION` for the link, or null (search first). */
  option: string | null;
  onValues: (next: Record<string, string>) => void;
  onOption: (next: string | null) => void;
  onBlur?: () => void;
  /** The organization a name lookup runs in; without it a link-only source asks for its link. */
  organizationId?: string | null;
}) {
  const options = searchOptions(source);
  const current = modeOf(source, option, values);
  const searchOnly = source.input.kind === "keyword";
  const everyOption = options.map((o) => {
    const words = plainOption(o.name);
    return { ...o, ...words, advanced: words.advanced || o.fields.some((f) => plainField(f, source.key).advanced) };
  });
  const everyday = everyOption.filter((o) => !o.advanced);
  const technical = everyOption.filter((o) => o.advanced);
  const finder = source.input.kind === "url" && organizationId ? nameFinderFor(source.key) : null;
  const linkField = source.input.kind === "url" ? inputFieldsFor(source, null)[0] : null;
  const usingTechnical = Boolean(current.option && technical.some((o) => o.name === current.option));
  // What opens first: the chosen (or first everyday) search; a name box; else the link itself.
  const shownSearch = current.mode === "search" && !usingTechnical ? current.option : (everyday[0]?.name ?? null);
  const primaryFields = shownSearch ? inputFieldsFor(source, shownSearch) : searchOnly ? source.input.fields : [];
  const linkIsPrimary = !searchOnly && !shownSearch && !finder;
  const hasAdvanced = Boolean((linkField && !linkIsPrimary) || technical.length > 0);
  const [advanced, setAdvanced] = useState(() => usingTechnical || (current.mode === "link" && Boolean(values.url) && !finder));
  const homeCountry = useMemo(() => defaultCountry(), []);
  const countries = useMemo(() => countryOptions(homeCountry), [homeCountry]);
  const askedFields = current.mode === "search" ? inputFieldsFor(source, current.option) : primaryFields;
  const firstDefaults = askedFields.flatMap((f) => {
    const plain = plainField(f, source.key);
    if (values[f.name]) return [];
    if (plain.picker === "country") return [[f.name, homeCountry] as const];
    if (plain.choices) return [[f.name, plain.choices[0].value] as const];
    return [];
  });
  useEffect(() => {
    // A picker shows a value, so the form holds it too — when the form first asks (a source or option change), never while typing.
    if (firstDefaults.length > 0) onValues({ ...values, ...Object.fromEntries(firstDefaults) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.key, current.option]);

  const box = (f: DataSourceField, placeholder: string, voice: boolean) => (
    <FieldBox key={f.name} f={f} sourceKey={source.key} values={values} onValues={onValues} onBlur={onBlur} placeholder={placeholder} homeCountry={homeCountry} countries={countries} voice={voice} />
  );
  const searchValues = (next: Record<string, string>) => {
    // Typing a search leaves the link behind (the search is what runs).
    if (current.mode === "link" && shownSearch) onOption(shownSearch);
    const { url: _drop, ...rest } = next;
    onValues(shownSearch ? rest : next);
  };
  const linkPlaceholder = source.example_url ?? "https://";

  return (
    <div className="flex flex-col gap-3" data-source-input={current.mode}>
      {everyday.length > 1 && (
        <Select
          aria-label="Search by"
          value={shownSearch ?? everyday[0].name}
          options={everyday.map((o) => ({ value: o.name, label: o.label }))}
          onValueChange={onOption}
        />
      )}
      {finder && organizationId && !shownSearch && (
        <NameFinder
          finder={finder}
          organizationId={organizationId}
          page={values.url ?? null}
          onPage={(page) => {
            onOption(null);
            onValues(page ? { ...values, url: page } : Object.fromEntries(Object.entries(values).filter(([k]) => k !== "url")));
          }}
        />
      )}
      {primaryFields.map((f) => {
        const plain = plainField(f, source.key);
        return (
          <FieldBox key={f.name} f={f} sourceKey={source.key} values={values} onValues={searchValues} onBlur={onBlur} placeholder={plain.placeholder ?? ""} homeCountry={homeCountry} countries={countries} voice />
        );
      })}
      {linkIsPrimary && linkField && box(linkField, linkPlaceholder, false)}
      {hasAdvanced && (
        <div className="flex flex-col gap-3" data-advanced={advanced ? "open" : "closed"}>
          <Button
            type="button"
            variant="quiet"
            className="self-start"
            icon={advanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            onClick={() => setAdvanced((v) => !v)}
            aria-expanded={advanced}
          >
            Advanced
          </Button>
          {advanced && (
            <div className="flex flex-col gap-3 border-l border-border pl-3">
              {linkField && !linkIsPrimary && (
                <FieldBox
                  f={linkField}
                  sourceKey={source.key}
                  values={values}
                  onValues={(next) => {
                    onOption(next.url?.trim() ? LINK_OPTION : null);
                    onValues(next);
                  }}
                  onBlur={onBlur}
                  placeholder={linkPlaceholder}
                  homeCountry={homeCountry}
                  countries={countries}
                  voice={false}
                />
              )}
              {technical.length > 0 && (
                <div className="flex flex-wrap gap-1" role="group" aria-label="Other ways to ask">
                  {technical.map((o) => (
                    <Button
                      key={o.name}
                      type="button"
                      variant={current.option === o.name ? "outline" : "quiet"}
                      aria-pressed={current.option === o.name}
                      onClick={() => onOption(current.option === o.name ? null : o.name)}
                    >
                      {o.label}
                    </Button>
                  ))}
                </div>
              )}
              {usingTechnical && inputFieldsFor(source, current.option).map((f) => box(f, plainField(f, source.key).placeholder ?? "", false))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
