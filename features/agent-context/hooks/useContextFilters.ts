'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { ContextItemFilters, ContextItemSort, ContextItemView, ContextItemStatus, ContextFetchHint, ContextSensitivity } from '../types';

const DEFAULT_FILTERS: ContextItemFilters = {
  search: '',
  statuses: [],
  categories: [],
  fetchHints: [],
  sensitivities: [],
  hasValue: 'either',
};

const DEFAULT_SORT: ContextItemSort = {
  field: 'display_name',
  direction: 'asc',
};

export function useContextFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const filters: ContextItemFilters = useMemo(() => ({
    search: searchParams.get('q') || '',
    statuses: (searchParams.get('status')?.split(',').filter(Boolean) ?? []) as ContextItemStatus[],
    categories: searchParams.get('cat')?.split(',').filter(Boolean) ?? [],
    fetchHints: (searchParams.get('hint')?.split(',').filter(Boolean) ?? []) as ContextFetchHint[],
    sensitivities: (searchParams.get('sens')?.split(',').filter(Boolean) ?? []) as ContextSensitivity[],
    hasValue: (searchParams.get('hasValue') as 'yes' | 'no' | 'either') || 'either',
  }), [searchParams]);

  const sort: ContextItemSort = useMemo(() => ({
    field: (searchParams.get('sort') as ContextItemSort['field']) || DEFAULT_SORT.field,
    direction: (searchParams.get('dir') as 'asc' | 'desc') || DEFAULT_SORT.direction,
  }), [searchParams]);

  const view: ContextItemView = (searchParams.get('view') as ContextItemView) || 'cards';

  const updateParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      updater(params);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const setSearch = useCallback((q: string) => {
    updateParams(p => { q ? p.set('q', q) : p.delete('q'); });
  }, [updateParams]);

  const setStatuses = useCallback((statuses: ContextItemStatus[]) => {
    updateParams(p => { statuses.length ? p.set('status', statuses.join(',')) : p.delete('status'); });
  }, [updateParams]);

  const setCategories = useCallback((cats: string[]) => {
    updateParams(p => { cats.length ? p.set('cat', cats.join(',')) : p.delete('cat'); });
  }, [updateParams]);

  const setFetchHints = useCallback((hints: ContextFetchHint[]) => {
    updateParams(p => { hints.length ? p.set('hint', hints.join(',')) : p.delete('hint'); });
  }, [updateParams]);

  const setSensitivities = useCallback((sens: ContextSensitivity[]) => {
    updateParams(p => { sens.length ? p.set('sens', sens.join(',')) : p.delete('sens'); });
  }, [updateParams]);

  const setHasValue = useCallback((val: 'yes' | 'no' | 'either') => {
    updateParams(p => { val !== 'either' ? p.set('hasValue', val) : p.delete('hasValue'); });
  }, [updateParams]);

  const setSort = useCallback((s: ContextItemSort) => {
    updateParams(p => {
      p.set('sort', s.field);
      p.set('dir', s.direction);
    });
  }, [updateParams]);

  const setView = useCallback((v: ContextItemView) => {
    updateParams(p => p.set('view', v));
  }, [updateParams]);

  const clearFilters = useCallback(() => {
    updateParams(p => {
      p.delete('q');
      p.delete('status');
      p.delete('cat');
      p.delete('hint');
      p.delete('sens');
      p.delete('hasValue');
    });
  }, [updateParams]);

  const hasActiveFilters = filters.search !== '' || filters.statuses.length > 0 || filters.categories.length > 0 || filters.fetchHints.length > 0 || filters.sensitivities.length > 0 || filters.hasValue !== 'either';

  return {
    filters,
    sort,
    view,
    setSearch,
    setStatuses,
    setCategories,
    setFetchHints,
    setSensitivities,
    setHasValue,
    setSort,
    setView,
    clearFilters,
    hasActiveFilters,
  };
}
