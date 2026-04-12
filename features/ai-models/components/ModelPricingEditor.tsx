"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, DollarSign, AlertCircle } from "lucide-react";
import type { PricingTier } from "../types";

interface ModelPricingEditorProps {
  tiers: PricingTier[] | null | undefined;
  onChange: (tiers: PricingTier[]) => void;
}

function emptyTier(): PricingTier {
  return {
    max_tokens: null,
    input_price: 0,
    output_price: 0,
    cached_input_price: 0,
  };
}

function normalizeTier(raw: unknown): PricingTier {
  const t = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    max_tokens: typeof t.max_tokens === "number" ? t.max_tokens : null,
    input_price: typeof t.input_price === "number" ? t.input_price : 0,
    output_price: typeof t.output_price === "number" ? t.output_price : 0,
    cached_input_price:
      typeof t.cached_input_price === "number" ? t.cached_input_price : 0,
  };
}

function normalizeTiers(raw: PricingTier[] | null | undefined): PricingTier[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeTier);
}

function formatPrice(p: number | null | undefined): string {
  if (p == null || !isFinite(p)) return "$—";
  return `$${p.toFixed(p < 0.01 ? 4 : p < 1 ? 3 : 2)}`;
}

function PriceInput({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number) => void;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          $
        </span>
        <Input
          type="number"
          step="0.001"
          min="0"
          value={value ?? 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="h-7 text-xs pl-5 font-mono"
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground/70">{description}</p>
      )}
    </div>
  );
}

export default function ModelPricingEditor({
  tiers: rawTiers,
  onChange,
}: ModelPricingEditorProps) {
  const tiers = normalizeTiers(rawTiers);

  const updateTier = (index: number, patch: Partial<PricingTier>) => {
    const next = tiers.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange(next);
  };

  const addTier = () => {
    onChange([...tiers, emptyTier()]);
  };

  const removeTier = (index: number) => {
    onChange(tiers.filter((_, i) => i !== index));
  };

  const hasMultipleTiers = tiers.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Pricing Tiers</span>
          {tiers.length === 0 && (
            <Badge
              variant="outline"
              className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20"
            >
              No pricing set
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={addTier}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Tier
        </Button>
      </div>

      {tiers.length === 0 && (
        <div className="rounded-md border border-dashed p-6 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No pricing configured for this model.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Click &quot;Add Tier&quot; to define input/output token prices (per
            million tokens).
          </p>
        </div>
      )}

      <div className="space-y-3">
        {tiers.map((tier, i) => (
          <div key={i} className="rounded-md border bg-card p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tier {i + 1}
                </span>
                {i === tiers.length - 1 && hasMultipleTiers && (
                  <Badge variant="outline" className="text-xs h-4 px-1">
                    highest
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeTier(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <PriceInput
                label="Input Price / 1M tokens"
                value={tier.input_price}
                onChange={(v) => updateTier(i, { input_price: v })}
              />
              <PriceInput
                label="Output Price / 1M tokens"
                value={tier.output_price}
                onChange={(v) => updateTier(i, { output_price: v })}
              />
              <PriceInput
                label="Cached Input Price / 1M tokens"
                value={tier.cached_input_price}
                onChange={(v) => updateTier(i, { cached_input_price: v })}
                description="Cache read discount"
              />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Max Tokens Threshold
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="null = no limit / highest tier"
                  value={tier.max_tokens ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    updateTier(i, {
                      max_tokens: raw === "" ? null : parseInt(raw),
                    });
                  }}
                  className="h-7 text-xs font-mono"
                />
                <p className="text-xs text-muted-foreground/70">
                  Leave empty for the final/only tier
                </p>
              </div>
            </div>

            {/* Summary row */}
            <div className="flex items-center gap-3 pt-1 border-t text-xs text-muted-foreground font-mono">
              <span>in {formatPrice(tier.input_price)}</span>
              <span>out {formatPrice(tier.output_price)}</span>
              <span>cached {formatPrice(tier.cached_input_price)}</span>
              {tier.max_tokens != null && (
                <span className="text-muted-foreground/60">
                  ≤ {tier.max_tokens.toLocaleString()} tokens
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMultipleTiers && (
        <div className="rounded-md bg-muted/50 border p-2.5 text-xs text-muted-foreground space-y-1">
          <p className="font-medium">Tiered pricing note:</p>
          <p>
            Tiers apply based on the prompt context length. The last tier
            (max_tokens = null) covers all prompts above the previous threshold.
            Order tiers from smallest to largest.
          </p>
        </div>
      )}
    </div>
  );
}
