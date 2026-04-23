'use client';

import React, { useState } from 'react';
import {
  AdvancedRunSettings,
  DEFAULT_ADVANCED_RUN_SETTINGS,
  computeComplexity,
  type AdvancedRunSettingsValue,
} from '@/features/agents/components/run-controls/AdvancedRunSettings';

export default function AdvancedRunSettingsDemoPage() {
  const [value, setValue] = useState<AdvancedRunSettingsValue>(
    DEFAULT_ADVANCED_RUN_SETTINGS,
  );

  const complexity = computeComplexity(value);

  return (
    <div className="h-full overflow-y-auto bg-textured">
      <div className="max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-3 border-b border-border bg-muted/30">
            <h1 className="text-sm font-semibold text-foreground">
              Advanced agent settings
            </h1>
          </div>
          <div className="px-6 py-6">
            <AdvancedRunSettings onChange={setValue} />
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-card overflow-hidden self-start xl:sticky xl:top-6">
          <div className="px-4 py-2 border-b border-border bg-muted/30">
            <h2 className="text-xs font-semibold text-foreground">Live value</h2>
          </div>
          <div className="px-4 py-3 space-y-3 text-[11px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-muted-foreground uppercase tracking-wide">
                Total
              </span>
              <span className="font-semibold text-foreground tabular-nums">
                {complexity.total}
              </span>
            </div>
            <div className="space-y-1 font-mono">
              {Object.entries(complexity.breakdown).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-foreground tabular-nums">{v}</span>
                </div>
              ))}
            </div>
            <pre className="mt-3 pt-3 border-t border-border text-[10px] leading-relaxed font-mono overflow-x-auto max-h-[50vh] overflow-y-auto">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        </aside>
      </div>
    </div>
  );
}
