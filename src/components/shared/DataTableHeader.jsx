import { Ico, IC } from "../ui";
import { ColFilter, TextFilter, DateRangeFilter, NumberRangeFilter } from "./Filters";

export function DataTableHeader({
  cols, rows,
  paged, bulkSel, setBulkSel,
  sort, toggleSort,
  colF, setColF,
  dateF, setDateF,
  numF, setNumF,
  textF, setTextF,
  thCls = "py-2 px-2 border-b border-border-default text-xs align-middle",
  stickyL = "sticky left-0 z-[1] shadow-[3px_0_6px_rgba(0,0,0,0.05)] bg-surface-alt",
  stickyR = "sticky right-0 z-[1] shadow-[-3px_0_6px_rgba(0,0,0,0.05)] bg-surface-alt",
  hasActions = true
}) {

  const SortIco = ({ col }) => sort.col === col
    ? <Ico d={sort.dir === "asc" ? IC.sortU : IC.sortD} size={9} color="var(--color-brand)" />
    : <Ico d={IC.sortN} size={9} color="var(--color-border-strong)" />;

  return (
    <thead>
      <tr>
        <th className={`${thCls} w-9 ${stickyL}`}>
          <input
            type="checkbox"
            checked={paged.length > 0 && paged.every((p) => bulkSel.has(p.id))}
            onChange={(e) => {
              const s = new Set(bulkSel);
              paged.forEach((p) => e.target.checked ? s.add(p.id) : s.delete(p.id));
              setBulkSel(s);
            }}
          />
        </th>
        {cols.map(({ col, label, ft, fk, noSort, keyFn, labelFn }) => (
          <th key={col} className={thCls} onClick={!noSort ? () => toggleSort(col) : undefined}>
            <div className="flex items-center gap-1">
              {label}{!noSort && <SortIco col={col} />}
              {ft === "col" && (
                <ColFilter col={col} rows={rows}
                  keyFn={keyFn}
                  labelFn={labelFn}
                  active={colF[col]}
                  onApply={(s) => setColF((p) => { const nw = { ...p }; if (s) nw[col] = s; else delete nw[col]; return nw; })}
                />
              )}
              {ft === "text" && <TextFilter active={textF[fk]} onApply={(v) => setTextF((p) => { const nw = { ...p }; if (v) nw[fk] = v; else delete nw[fk]; return nw; })} label={label} />}
              {ft === "date" && <DateRangeFilter active={dateF[fk]} onApply={(v) => setDateF((p) => { const nw = { ...p }; if (v) nw[fk] = v; else delete nw[fk]; return nw; })} label={label} />}
              {ft === "num"  && <NumberRangeFilter active={numF[fk]} onApply={(v) => setNumF((p) => { const nw = { ...p }; if (v) nw[fk] = v; else delete nw[fk]; return nw; })} label={label} />}
            </div>
          </th>
        ))}
        {hasActions && (
          <th className={`${thCls} w-[76px] ${stickyR} z-[4]`}>Aksi</th>
        )}
      </tr>
    </thead>
  );
}
