import { useState, useEffect, useMemo } from "react";
import { usePOStore } from "../store/usePOStore";
import { usePersist } from "./usePersist";

export function useDataTable(initialSortCol = "", initialSortDir = "asc", defaultPerPage = 50, persistenceKey = null) {
  const settings = usePOStore((state) => state.settings);
  
  // Choose between persistent and transient state
  const useMaybePersist = (subkey, init) => {
    if (!persistenceKey) return useState(init);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePersist(`${persistenceKey}-${subkey}`, init);
  };

  const [search, setSearch]   = useMaybePersist("search", "");
  const [page, setPage]       = useMaybePersist("page", 1); 
  const [perPage, setPerPage] = useMaybePersist("perPage", settings?.paginationSize || defaultPerPage);
  
  // colF needs special handling because Sets don't serialize to JSON
  const [colFInternal, setColFInternal] = useMaybePersist("colF", {});

  // Convert Arrays from persistence to Sets for the UI
  const colF = useMemo(() => {
    const sets = {};
    Object.keys(colFInternal || {}).forEach(k => {
      if (Array.isArray(colFInternal[k])) {
        sets[k] = new Set(colFInternal[k]);
      } else {
        sets[k] = colFInternal[k];
      }
    });
    return sets;
  }, [colFInternal]);

  // Wrapper to convert Sets back to Arrays before saving
  const setColF = (valOrFn) => {
    setColFInternal(prev => {
      const next = typeof valOrFn === "function" ? valOrFn(colF) : valOrFn;
      if (!next) return {};
      const persistent = {};
      Object.keys(next).forEach(k => {
        if (next[k] instanceof Set) {
          persistent[k] = Array.from(next[k]);
        } else {
          persistent[k] = next[k];
        }
      });
      return persistent;
    });
  };

  const [dateF, setDateF]     = useMaybePersist("dateF", {});
  const [numF, setNumF]       = useMaybePersist("numF", {});
  const [textF, setTextF]     = useMaybePersist("textF", {});
  const [sort, setSort]       = useMaybePersist("sort", { col: initialSortCol, dir: initialSortDir });
  const [bulkSel, setBulkSel] = useState(new Set());

  useEffect(() => {
    // Reset selection and page when filters or page size change
    setBulkSel(new Set());
    setPage(1);
  }, [colF, dateF, numF, textF, perPage, search]);

  const toggleSort = (col) => {
    setSort((s) => {
      if (s.col !== col) return { col, dir: "asc" };
      if (s.dir === "asc") return { col, dir: "desc" };
      return { col: "", dir: "" }; 
    });
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setColF({});
    setDateF({});
    setNumF({});
    setTextF({});
    setPage(1);
  };

  const hasFilters = Boolean(
    search || 
    Object.keys(colF).length > 0 || 
    Object.keys(dateF).length > 0 || 
    Object.keys(numF).length > 0 || 
    Object.keys(textF).length > 0
  );

  const getPaged = (sortedFilteredArr) => {
    return perPage === "All" 
      ? sortedFilteredArr 
      : sortedFilteredArr.slice((page - 1) * (Number(perPage) || 50), page * (Number(perPage) || 50));
  };

  const toggleBulkRow = (id) => {
    const s = new Set(bulkSel);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setBulkSel(s);
  };

  const clearBulk = () => setBulkSel(new Set());

  return {
    search, setSearch,
    page, setPage,
    perPage, setPerPage,
    colF, setColF,
    dateF, setDateF,
    numF, setNumF,
    textF, setTextF,
    sort, setSort, toggleSort,
    bulkSel, setBulkSel, toggleBulkRow, clearBulk,
    resetFilters, hasFilters,
    getPaged
  };
}
