"use client";

import { useEffect } from "react";
import type { UserListWithItems } from "../types";
import { useActiveList } from "./ActiveListContext";

interface ActiveListRegistrarProps {
  data: UserListWithItems;
}

/**
 * Registers the active list data into the layout context so the tree nav
 * can display group children without a separate fetch.
 */
export function ActiveListRegistrar({ data }: ActiveListRegistrarProps) {
  const { setActiveListData } = useActiveList();

  useEffect(() => {
    setActiveListData(data);
    return () => setActiveListData(null);
  }, [data, setActiveListData]);

  return null;
}
