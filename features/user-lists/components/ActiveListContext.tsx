"use client";

import React, { createContext, useContext, useState } from "react";
import type { UserListWithItems } from "../types";

interface ActiveListContextValue {
  activeListData: UserListWithItems | null;
  setActiveListData: (data: UserListWithItems | null) => void;
}

const ActiveListContext = createContext<ActiveListContextValue>({
  activeListData: null,
  setActiveListData: () => {},
});

export function ActiveListProvider({ children }: { children: React.ReactNode }) {
  const [activeListData, setActiveListData] = useState<UserListWithItems | null>(null);

  return (
    <ActiveListContext.Provider value={{ activeListData, setActiveListData }}>
      {children}
    </ActiveListContext.Provider>
  );
}

export function useActiveList() {
  return useContext(ActiveListContext);
}
