'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Code2, Search, Users, Scale, Shield, Heart, ShoppingBag, Store, Brain, Globe, ChevronRight, Check, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useContextTemplates, useApplyTemplate } from '../hooks/useContextItems';
import { INDUSTRY_CATEGORIES, FETCH_HINT_CONFIG, SENSITIVITY_CONFIG, VALUE_TYPE_CONFIG } from '../constants';
import type { ContextTemplate } from '../types';
import type { ScopeState } from '../hooks/useContextScope';

const INDUSTRY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe, Code2, Search, Users, Scale, Shield, Heart, ShoppingBag, Store, Brain,
};

type Props = {
  scope: ScopeState;
};

export function ContextTemplateBrowser({ scope }: Props) {
  const { data: templates, isLoading } = useContextTemplates();
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [applyDialog, setApplyDialog] = useState<{ industry: string; items: ContextTemplate[] } | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const applyMutation = useApplyTemplate(scope.scopeType, scope.scopeId);
  const router = useRouter();

  const grouped = useMemo(() => {
    if (!templates) return new Map<string, ContextTemplate[]>();
    const map = new Map<string, ContextTemplate[]>();
    for (const t of templates) {
      const list = map.get(t.industry_category) ?? [];
      list.push(t);
      map.set(t.industry_category, list);
    }
    return map;
  }, [templates]);

  const detailItems = selectedIndustry ? (grouped.get(selectedIndustry) ?? []) : [];

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  // ─── Detail view ──────────────────────────────
  if (selectedIndustry) {
    const industry = INDUSTRY_CATEGORIES.find(c => c.key === selectedIndustry);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedIndustry(null)}>
            &larr; All Templates
          </Button>
          <h2 className="text-sm font-semibold">{industry?.label ?? selectedIndustry}</h2>
          <Badge variant="outline" className="text-[10px]">{detailItems.length} items</Badge>
        </div>

        <div className="space-y-2">
          {detailItems.map(item => (
            <Card key={item.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-3 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold">{item.item_display_name}</h3>
                    <code className="text-[10px] font-mono text-muted-foreground">{item.item_key}</code>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.item_description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="secondary" className="h-4 text-[9px]">{VALUE_TYPE_CONFIG[item.default_value_type].label}</Badge>
                    <Badge variant="outline" className="h-4 text-[9px]">{item.default_scope_level}</Badge>
                    {item.is_required && <Badge variant="warning" className="h-4 text-[9px]">Required</Badge>}
                  </div>
                  {item.fill_guidance && (
                    <p className="text-[10px] text-muted-foreground/70 mt-1 italic">{item.fill_guidance}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button
          size="sm"
          className="text-xs"
          onClick={() => {
            const checked = new Set(detailItems.map(i => i.id));
            setCheckedItems(checked);
            setApplyDialog({ industry: selectedIndustry, items: detailItems });
          }}
        >
          Apply to {scope.scopeName} &rarr;
        </Button>
      </div>
    );
  }

  // ─── Grid view ────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Industry Templates</h2>
        <p className="text-xs text-muted-foreground">
          Start fast — pick a template to bootstrap your context library
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {INDUSTRY_CATEGORIES.map(cat => {
          const items = grouped.get(cat.key) ?? [];
          if (items.length === 0) return null;
          const Icon = INDUSTRY_ICONS[cat.iconName] ?? Globe;
          const requiredCount = items.filter(i => i.is_required).length;
          const examples = items.slice(0, 3).map(i => i.item_display_name);

          return (
            <Card key={cat.key} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedIndustry(cat.key)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold">{cat.label}</h3>
                    <p className="text-[10px] text-muted-foreground">{items.length} items &middot; {requiredCount} required</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {examples.map(ex => (
                    <Badge key={ex} variant="outline" className="h-4 text-[9px] px-1">{ex}</Badge>
                  ))}
                  {items.length > 3 && (
                    <Badge variant="outline" className="h-4 text-[9px] px-1">+{items.length - 3} more</Badge>
                  )}
                </div>
                <div className="flex items-center justify-end mt-3 gap-2">
                  <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2">
                    Preview <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={e => {
                      e.stopPropagation();
                      const checked = new Set(items.map(i => i.id));
                      setCheckedItems(checked);
                      setApplyDialog({ industry: cat.key, items });
                    }}
                  >
                    Apply &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Apply dialog */}
      {applyDialog && (
        <ApplyTemplateDialog
          items={applyDialog.items}
          checked={checkedItems}
          onCheckedChange={setCheckedItems}
          onApply={() => {
            const selected = applyDialog.items.filter(i => checkedItems.has(i.id));
            applyMutation.mutate(selected, {
              onSuccess: () => {
                setApplyDialog(null);
                router.push('/ssr/context');
              },
            });
          }}
          onClose={() => setApplyDialog(null)}
          isPending={applyMutation.isPending}
          scopeName={scope.scopeName}
        />
      )}
    </div>
  );
}

function ApplyTemplateDialog({
  items, checked, onCheckedChange, onApply, onClose, isPending, scopeName,
}: {
  items: ContextTemplate[];
  checked: Set<string>;
  onCheckedChange: (s: Set<string>) => void;
  onApply: () => void;
  onClose: () => void;
  isPending: boolean;
  scopeName: string;
}) {
  const required = items.filter(i => i.is_required);
  const optional = items.filter(i => !i.is_required);

  const toggle = (id: string, isRequired: boolean) => {
    if (isRequired) return;
    const next = new Set(checked);
    next.has(id) ? next.delete(id) : next.add(id);
    onCheckedChange(next);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Apply Template to {scopeName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Agent pre-fill placeholder */}
          <Button variant="outline" size="sm" className="w-full text-xs gap-1 h-7">
            <Bot className="h-3 w-3" /> AI Pre-fill Suggestions
            {/* TODO: Wire agent */}
          </Button>

          {required.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5">Required ({required.length})</p>
              {required.map(item => (
                <div key={item.id} className="flex items-center gap-2 py-1">
                  <Checkbox checked disabled />
                  <span className="text-xs">{item.item_display_name}</span>
                  <Badge variant="outline" className="h-4 text-[9px] ml-auto">{item.default_value_type}</Badge>
                </div>
              ))}
            </div>
          )}

          {optional.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5">Optional ({optional.length})</p>
              {optional.map(item => (
                <div key={item.id} className="flex items-center gap-2 py-1">
                  <Checkbox
                    checked={checked.has(item.id)}
                    onCheckedChange={() => toggle(item.id, false)}
                  />
                  <span className="text-xs">{item.item_display_name}</span>
                  <Badge variant="outline" className="h-4 text-[9px] ml-auto">{item.default_value_type}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <p className="text-[10px] text-muted-foreground flex-1">
            Creating {checked.size} context items as stubs
          </p>
          <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="text-xs" onClick={onApply} disabled={isPending}>
            {isPending ? 'Applying...' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
