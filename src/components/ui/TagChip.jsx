import { Ico, IC } from "./Icon";

/**
 * Small tag chip (used for supplier tags, etc.)
 */
export function TagChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-soft border border-brand-mid text-brand text-[10px] font-semibold">
      <Ico d={IC.tag} size={9} color="currentColor" />
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="bg-transparent border-none cursor-pointer text-brand flex p-0 ml-0.5"
        >
          <Ico d={IC.close} size={8} />
        </button>
      )}
    </span>
  );
}
