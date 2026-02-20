'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Loader2 } from 'lucide-react';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchApi } from '../../hooks/useResearchApi';
import type { ResearchCosts } from '../../types';

export default function CostDashboard() {
    const { topicId } = useTopicContext();
    const api = useResearchApi();
    const [data, setData] = useState<ResearchCosts | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        api.getCosts(topicId)
            .then(res => res.json())
            .then((costs: ResearchCosts) => {
                if (!cancelled) setData(costs);
            })
            .catch(() => {
                if (!cancelled) setData(null);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => { cancelled = true; };
    }, [api, topicId]);

    const costs = data as ResearchCosts | null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading costs...
            </div>
        );
    }

    if (!costs) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[280px] gap-3 p-6 text-center">
                <div className="h-12 w-12 rounded-2xl bg-primary/8 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-primary/40" />
                </div>
                <div>
                    <p className="text-xs font-medium text-foreground/70">No cost data yet</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1 max-w-[240px]">
                        Costs are tracked automatically as you run scraping, analysis, synthesis, and document generation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 space-y-3">
            <div className="flex items-center gap-2 rounded-full glass px-3 py-1.5">
                <span className="text-xs font-medium text-foreground/80">Costs</span>
                <div className="flex-1" />
                <span className="text-[10px] text-muted-foreground tabular-nums">${costs.total_estimated_cost.toFixed(4)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Estimated Cost</div>
                    <div className="text-lg font-bold mt-0.5 tabular-nums leading-none">
                        ${costs.total_estimated_cost.toFixed(4)}
                    </div>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">LLM Calls</div>
                    <div className="text-lg font-bold mt-0.5 tabular-nums leading-none">
                        {costs.total_llm_calls}
                    </div>
                </div>
            </div>

            {/* Breakdown Table */}
            {costs.breakdown.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/50">
                                <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground">Category</th>
                                <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground">Calls</th>
                                <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground hidden sm:table-cell">In Tokens</th>
                                <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground hidden sm:table-cell">Out Tokens</th>
                                <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground">Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {costs.breakdown.map((row, i) => (
                                <tr key={i} className="border-b border-border/40 last:border-0">
                                    <td className="px-3 py-1.5 font-medium">{row.category}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{row.calls}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums hidden sm:table-cell">{row.input_tokens.toLocaleString()}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums hidden sm:table-cell">{row.output_tokens.toLocaleString()}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums font-medium">${row.estimated_cost.toFixed(4)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-muted/20 font-semibold">
                                <td className="px-3 py-1.5">Total</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{costs.total_llm_calls}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums hidden sm:table-cell">
                                    {costs.breakdown.reduce((sum, r) => sum + r.input_tokens, 0).toLocaleString()}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums hidden sm:table-cell">
                                    {costs.breakdown.reduce((sum, r) => sum + r.output_tokens, 0).toLocaleString()}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">${costs.total_estimated_cost.toFixed(4)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
