"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// HeaderTabs — Variant 6
// ═══════════════════════════════════════════════════════════════════════════════
//
// ┌─────────────────────────────────────────────────────────────────┐
// │  ≡  │      Recent      Starred     Archive      │  ◉  │
// │     │      ━━━━━━                                │     │
// └─────────────────────────────────────────────────────────────────┘
//
// Three compact underline-style tabs. Lighter than pills.
// No back or actions — tabs fill the zone.
//
// Usage:
//   <PageHeader>
//     <HeaderTabs
//       options={[
//         { label: "Recent",  value: "recent",  badge: 5 },
//         { label: "Starred", value: "starred" },
//         { label: "Archive", value: "archive" },
//       ]}
//       active="recent"
//       onChange={setFilter}
//     />
//   </PageHeader>

import type { HeaderOption } from "../types";

interface HeaderTabsProps<T extends string = string> {
  /** Exactly 3 options */
  options: [HeaderOption<T>, HeaderOption<T>, HeaderOption<T>];
  /** Currently active value */
  active: T;
  /** Change handler */
  onChange: (value: T) => void;
}

export default function HeaderTabs<T extends string = string>({
  options,
  active,
  onChange,
}: HeaderTabsProps<T>) {
  return (
    <div className="hdr-tabs-track" role="tablist">
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <button
            key={option.value}
            className={`hdr-tab ${isActive ? "hdr-tab-active" : ""}`}
            onClick={() => onChange(option.value)}
            type="button"
            role="tab"
            aria-selected={isActive}
          >
            <span className="hdr-tab-label">
              {option.label}
              {option.badge != null && option.badge > 0 && (
                <span className={`hdr-tab-badge ${isActive ? "hdr-tab-badge-active" : ""}`}>
                  {option.badge > 99 ? "99+" : option.badge}
                </span>
              )}
            </span>
            {/* Underline indicator */}
            <span className={`hdr-tab-indicator ${isActive ? "hdr-tab-indicator-active" : ""}`} />
          </button>
        );
      })}
    </div>
  );
}
