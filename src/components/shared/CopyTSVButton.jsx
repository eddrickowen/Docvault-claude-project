import { useState, useRef } from "react";
import { Btn, Ico, IC } from "../ui";
import { copyTSV } from "../../lib/helpers";

/**
 * CopyTSVButton — reusable copy-to-clipboard button.
 *
 * Simple usage:
 *   <CopyTSVButton headers={[...]} rows={[...]} />
 *
 * Split-button with dropdown:
 *   <CopyTSVButton
 *     label="Copy"
 *     menuItems={[
 *       { label: "Per Item", getData: () => ({ headers, rows }) },
 *       { label: "Per PO",   getData: () => ({ headers, rows }) },
 *     ]}
 *   />
 */
export function CopyTSVButton({ headers, rows, getData, label = "Copy TSV", size = "sm", menuItems }) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef();

  const go = (h, r) => {
    copyTSV(h, r, () => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (menuItems?.length) {
    return (
      <div ref={wrapRef} className="relative inline-flex">
        <div className="inline-flex rounded-md border border-border-strong overflow-hidden">
          <Btn
            size={size}
            variant={copied ? "success" : "secondary"}
            onClick={() => { const d = menuItems[0].getData(); go(d.headers, d.rows); }}
            style={{ borderRadius: 0, border: "none" }}
          >
            <Ico d={IC.copy} size={11} /> {copied ? "Tersalin!" : label}
          </Btn>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="py-1 px-1.5 border-l border-border-strong bg-white text-text-secondary cursor-pointer flex items-center"
          >
            <Ico d={IC.chevD} size={10} />
          </button>
        </div>
        {menuOpen && (
          <div
            className="fixed z-[9999] bg-surface border border-border-strong rounded-lg shadow-[0_8px_24px_rgba(15,23,42,.15)] min-w-[190px] overflow-hidden"
            style={{
              top: (wrapRef.current?.getBoundingClientRect().bottom || 0) + 4,
              left: wrapRef.current?.getBoundingClientRect().left || 0,
            }}
            onMouseLeave={() => setMenuOpen(false)}
          >
            {menuItems.map(({ label: ml, getData }) => (
              <div
                key={ml}
                onClick={() => { const d = getData(); go(d.headers, d.rows); setMenuOpen(false); }}
                className="flex items-center gap-2 py-[9px] px-3.5 cursor-pointer text-xs hover:bg-brand-soft"
              >
                <Ico d={IC.copy} size={11} color="var(--color-brand)" />
                {ml}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Btn size={size} variant={copied ? "success" : "secondary"} onClick={() => { if (getData) { const d = getData(); go(d.headers, d.rows); } else go(headers, rows); }}>
      <Ico d={IC.copy} size={11} /> {copied ? "Tersalin!" : label}
    </Btn>
  );
}
