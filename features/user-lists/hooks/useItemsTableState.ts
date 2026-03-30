"use client";

import { useState, useMemo } from "react";
import type { UserListItem } from "../types";

export function useItemsTableState(items: UserListItem[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("group_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q) ||
        (item.group_name ?? "").toLowerCase().includes(q) ||
        (item.help_text ?? "").toLowerCase().includes(q),
    );
  }, [items, searchTerm]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortBy === "label") {
        aVal = a.label.toLowerCase();
        bVal = b.label.toLowerCase();
      } else if (sortBy === "group_name") {
        aVal = (a.group_name ?? "").toLowerCase();
        bVal = (b.group_name ?? "").toLowerCase();
      } else if (sortBy === "description") {
        aVal = (a.description ?? "").toLowerCase();
        bVal = (b.description ?? "").toLowerCase();
      } else if (sortBy === "created_at") {
        aVal = a.created_at;
        bVal = b.created_at;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortBy, sortDirection]);

  const totalItems = sortedItems.length;
  const totalPages =
    itemsPerPage === 0 ? 1 : Math.ceil(totalItems / itemsPerPage);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));

  const paginatedItems = useMemo(() => {
    if (itemsPerPage === 0) return sortedItems;
    const start = (safePage - 1) * itemsPerPage;
    return sortedItems.slice(start, start + itemsPerPage);
  }, [sortedItems, safePage, itemsPerPage]);

  const handleSortChange = (field: string) => {
    if (field === sortBy) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (n: number) => {
    setItemsPerPage(n);
    setCurrentPage(1);
  };

  return {
    searchTerm,
    handleSearchChange,
    sortBy,
    sortDirection,
    handleSortChange,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    handleItemsPerPageChange,
    filteredItems,
    paginatedItems,
    totalItems,
  };
}
