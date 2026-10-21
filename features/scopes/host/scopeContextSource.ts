"use client";

// features/scopes/host/scopeContextSource.ts — THE web's scope store, handed to the chat package's
// scope windows (`ScopeContextSourceProvider` from `@ai-matrx/chat/window-panels/windows/scopes/
// scope-context-source`). The package's "Set Context Value" body reads the same `scopesTree` /
// `contextValues` Redux every other scope screen draws from and writes through the same thunk, so a
// value saved there shows on the scope's page at once — one store on the web, never a second cache.

import { useEffect, useMemo } from "react";
import type { ScopeContextSource } from "@ai-matrx/chat/window-panels/windows/scopes/scope-context-source";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { ensureScopeTree } from "@/features/scopes/redux/thunks/ensureScopeTree";
import { ensureScopeTypeItems } from "@/features/scopes/redux/thunks/ensureScopeTypeItems";
import { ensureContextValues } from "@/features/scopes/redux/thunks/ensureContextValues";
import { setContextValue } from "@/features/scopes/redux/thunks/setContextValue";
import { selectOrganizationsList, selectTreeError, selectTreeStatus } from "@/features/scopes/redux/selectors/tree";
import { makeSelectItemsForType, makeSelectItemsStatusForType } from "@/features/scopes/redux/selectors/context-items";
import { makeSelectScopeValues } from "@/features/scopes/redux/selectors/context-values";

const readers: Omit<ScopeContextSource, "writeValue"> = {
  useTree() {
    const dispatch = useAppDispatch();
    const organizations = useAppSelector(selectOrganizationsList);
    const status = useAppSelector(selectTreeStatus);
    const error = useAppSelector(selectTreeError);
    useEffect(() => {
      void dispatch(ensureScopeTree());
    }, [dispatch]);
    return {
      organizations,
      status,
      error: status === "error" ? error : null,
      retry: () => void dispatch(ensureScopeTree({ refresh: true })),
    };
  },
  useFields(scopeTypeId) {
    const dispatch = useAppDispatch();
    const selectItems = useMemo(() => makeSelectItemsForType(), []);
    const selectStatus = useMemo(() => makeSelectItemsStatusForType(), []);
    const items = useAppSelector((s) => selectItems(s, scopeTypeId));
    const status = useAppSelector((s) => selectStatus(s, scopeTypeId));
    useEffect(() => {
      if (scopeTypeId) void dispatch(ensureScopeTypeItems(scopeTypeId));
    }, [scopeTypeId, dispatch]);
    return {
      items,
      status,
      retry: () => {
        if (scopeTypeId) void dispatch(ensureScopeTypeItems(scopeTypeId, { refresh: true }));
      },
    };
  },
  useValues(scopeId) {
    const dispatch = useAppDispatch();
    const selectValues = useMemo(() => makeSelectScopeValues(), []);
    const values = useAppSelector((s) => selectValues(s, scopeId));
    useEffect(() => {
      if (scopeId) void dispatch(ensureContextValues(scopeId));
    }, [scopeId, dispatch]);
    return values;
  },
};

/** The web's scope store as the package's source (the write goes through the app's own dispatch). */
export function useWebScopeContextSource(): ScopeContextSource {
  const dispatch = useAppDispatch();
  return useMemo(() => ({ ...readers, writeValue: (write) => dispatch(setContextValue(write)) }), [dispatch]);
}
