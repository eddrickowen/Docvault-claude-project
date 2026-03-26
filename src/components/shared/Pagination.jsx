import { Btn } from "../ui";

/**
 * Pagination — page navigation with ellipsis logic
 */
export function Pagination({ total, page, perPage, onChange, perPageOptions, onPerPageChange }) {
  const isAll = perPage === "All";
  const perPageNum = isAll ? (total || 1) : (Number(perPage) || 50);
  const totalSafe = Number(total) || 0;
  const pages = isAll ? 1 : Math.ceil(totalSafe / perPageNum) || 1;
  
  // Return early if no pagination needed AND no page-size selector was requested
  if (pages <= 1 && !perPageOptions) return null;

  const btns = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) btns.push(i);
  } else if (page <= 4) {
    [1, 2, 3, 4, 5, "…", pages].forEach((b) => btns.push(b));
  } else if (page >= pages - 3) {
    [1, "…", pages - 4, pages - 3, pages - 2, pages - 1, pages].forEach((b) => btns.push(b));
  } else {
    [1, "…", page - 1, page, page + 1, "…", pages].forEach((b) => btns.push(b));
  }

  const pageBtn = (active) =>
    `py-1 px-2.5 rounded-[5px] border text-[11px] font-semibold cursor-pointer min-w-[32px] ${
      active
        ? "border-brand bg-brand text-white"
        : "border-border-strong bg-white text-text-secondary"
    }`;

  return (
    <div className="flex items-center justify-between py-3 px-4 border-t border-border-default flex-wrap gap-3">
      <div className="flex items-center gap-1 justify-center flex-1">
        {!isAll && (
          <button className={pageBtn(false)} onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}>
            ‹
          </button>
        )}
        {!isAll && btns.map((b, i) =>
          b === "…" ? (
            <span key={"e" + i} className="py-1 px-1.5 text-text-muted text-[11px]">…</span>
          ) : (
            <button key={b} className={pageBtn(page === b)} onClick={() => onChange(b)}>{b}</button>
          )
        )}
        {!isAll && (
          <button className={pageBtn(false)} onClick={() => onChange(Math.min(pages, page + 1))} disabled={page === pages}>
            ›
          </button>
        )}
        <span className="text-[10px] text-text-muted ml-2">
          {total} total {!isAll && `· hal ${page}/${pages}`}
        </span>
      </div>

      {perPageOptions && onPerPageChange && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted">Baris per hal:</span>
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(e.target.value === "All" ? "All" : Number(e.target.value))}
            className="py-1 px-2 text-[11px] border border-border-strong rounded-md bg-white text-text-primary focus:outline-none focus:border-brand cursor-pointer"
          >
            {perPageOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
