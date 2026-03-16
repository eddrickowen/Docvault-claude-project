import { useState, useEffect } from "react";
import { usePOStore } from "../store/usePOStore";

export function useDataTable(initialSortCol = "", initialSortDir = "asc", defaultPerPage = 50) {
  const settings = usePOStore((state) => state.settings);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(settings?.paginationSize || defaultPerPage);
  const [colF, setColF] = useState({});
  const [dateF, setDateF] = useState({});
  const [numF, setNumF] = useState({});
  const [textF, setTextF] = useState({});
  const [sort, setSort] = useState({ col: initialSortCol, dir: initialSortDir });
  const [bulkSel, setBulkSel] = useState(new Set());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [colF, dateF, numF, textF, perPage]);

  const toggleSort = (col) => {
    setSort((s) => 
      s.col === col 
        ? { col, dir: s.dir === "asc" ? "desc" : "asc" } 
        : { col, dir: "asc" }
    );
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
      : sortedFilteredArr.slice((page - 1) * perPage, page * perPage);
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
