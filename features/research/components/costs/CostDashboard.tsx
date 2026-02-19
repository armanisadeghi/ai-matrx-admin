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
            <div className="flex flex-col items-center justify-center py-16 p-6 text-muted-foreground">
                <DollarSign className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">No cost data available yet.</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <h1 className="text-xl font-bold">Cost Dashboard</h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Estimated Cost</div>
                    <div className="text-3xl font-bold mt-1 tabular-nums">
                        ${costs.total_estimated_cost.toFixed(4)}
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Total LLM Calls</div>
                    <div className="text-3xl font-bold mt-1 tabular-nums">
                        {costs.total_llm_calls}
                    </div>
                </div>
            </div>

            {/* Breakdown Table */}
            {costs.breakdown.length > 0 && (
                <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Category</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Calls</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Input Tokens</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Output Tokens</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Est. Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {costs.breakdown.map((row, i) => (
                                <tr key={i} className="border-b border-border last:border-0">
                                    <td className="px-4 py-3 font-medium">{row.category}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">{row.calls}</td>
                                    <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">{row.input_tokens.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">{row.output_tokens.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right tabular-nums font-medium">${row.estimated_cost.toFixed(4)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-muted/30 font-semibold">
                                <td className="px-4 py-3">Total</td>
                                <td className="px-4 py-3 text-right tabular-nums">{costs.total_llm_calls}</td>
                                <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                                    {costs.breakdown.reduce((sum, r) => sum + r.input_tokens, 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                                    {costs.breakdown.reduce((sum, r) => sum + r.output_tokens, 0).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">${costs.total_estimated_cost.toFixed(4)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
