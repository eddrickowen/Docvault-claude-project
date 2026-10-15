import { Btn, Ico, IC, FIn } from "../ui";

export function DataTableToolbar({
  search, setSearch, setPage,
  hasFilters, resetFilters,
  bulkSelCount,
  searchPlaceholder = "Cari...",
  primaryAction,
  bulkActions,
  exportActions,
  totalCount,
  labelPostfix = "data"
}) {
  return (
    <div className="flex gap-2 py-3 px-4 border-b border-border-default flex-wrap items-center shrink-0 bg-surface">
      <div className="relative flex-[2] min-w-[200px] max-w-[420px]">
        <FIn
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder={searchPlaceholder}
          className="pl-[30px] pr-7 py-1"
        />
        <Ico d={IC.search} size={14} color="var(--color-text-muted)" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }} />
        {search && (
          <Btn variant="ghost" size="sm" onClick={() => { setSearch(""); setPage(1); }} className="absolute right-[7px] top-1/2 -translate-y-1/2 !p-0 !border-transparent">
            <Ico d={IC.close} size={12} />
          </Btn>
        )}
      </div>

      {primaryAction}

      {bulkSelCount > 0 ? (
        <div className="flex gap-1.5 items-center py-1 px-2.5 bg-brand-soft border border-brand-mid rounded-md ml-auto">
          <span className="text-[11px] text-brand font-semibold">{bulkSelCount} dipilih</span>
          {bulkActions}
        </div>
      ) : (
        <>
          {exportActions}
        </>
      )}

      {hasFilters && (
        <Btn size="sm" variant="amber" onClick={resetFilters}>
          <Ico d={IC.close} size={10} /> Reset Filter
        </Btn>
      )}

      {totalCount !== undefined && (
        <span className="text-[11px] text-text-muted ml-auto">{totalCount} {labelPostfix}</span>
      )}
    </div>
  );
}
