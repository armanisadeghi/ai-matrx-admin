// app/StoreProvider.tsx

"use client";

import { AppStore, makeStore } from "@/lib/redux/store";
import { useRef } from "react";
import { Provider } from "react-redux";
import { InitialReduxState, LiteInitialReduxState } from "@/types/reduxTypes";

export default function StoreProvider({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: Partial<InitialReduxState> & LiteInitialReduxState;
}) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = makeStore(initialState);
  }

  if (!storeRef.current) {
    throw new Error("Redux store failed to initialize");
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
