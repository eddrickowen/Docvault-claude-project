/**
 * Reusable Button component with Tailwind.
 *
 * Variants: primary | secondary | danger | success | ghost | blue | amber | purple
 * Sizes: sm | md | lg
 */

const base =
  "inline-flex items-center gap-1.5 rounded-md font-semibold cursor-pointer transition-colors duration-100 whitespace-nowrap select-none disabled:opacity-50 disabled:cursor-not-allowed";

const variantMap = {
  primary:   { idle: "bg-brand text-white border border-brand",           hover: "hover:bg-brand-hover" },
  secondary: { idle: "bg-white text-text-secondary border border-border-strong", hover: "hover:bg-surface-alt" },
  danger:    { idle: "bg-red-soft text-red border border-red-mid",        hover: "hover:bg-red-50" },
  success:   { idle: "bg-green-soft text-green border border-green-mid",  hover: "hover:bg-green-100" },
  ghost:     { idle: "bg-transparent text-text-muted border border-transparent", hover: "hover:bg-bg-app" },
  blue:      { idle: "bg-brand-soft text-brand border border-brand-mid",  hover: "hover:bg-brand-mid" },
  amber:     { idle: "bg-amber-soft text-amber border border-amber-200",  hover: "hover:bg-amber-100" },
  purple:    { idle: "bg-purple-soft text-purple border border-purple-200", hover: "hover:bg-purple-100" },
};

const sizeMap = {
  sm: "px-2.5 py-1 text-[13px]",
  md: "px-3.5 py-1.5 text-sm",
  lg: "px-4.5 py-2 text-[15px]",
};

export function Btn({
  onClick,
  children,
  variant = "primary",
  size = "md",
  disabled,
  title,
  className = "",
  type = "button",
  id,
  style,
}) {
  const v = variantMap[variant] || variantMap.primary;
  const s = sizeMap[size] || sizeMap.md;

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={style}
      className={`${base} ${v.idle} ${v.hover} ${s} ${className}`}
    >
      {children}
    </button>
  );
}
