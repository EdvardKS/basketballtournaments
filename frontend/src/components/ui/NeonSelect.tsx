import { forwardRef, useId, type SelectHTMLAttributes, type ReactNode } from "react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  children: ReactNode;
}

const NeonSelect = forwardRef<HTMLSelectElement, Props>(({
  label, hint, className = "", id, children, ...rest
}, ref) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[10px] uppercase tracking-[0.25em] text-court-muted font-semibold">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          className={`input-neon appearance-none pr-9 ${className}`}
          {...rest}
        >
          {children}
        </select>
        <span aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </div>
      {hint && <p className="text-[11px] text-court-muted pl-1">{hint}</p>}
    </div>
  );
});
NeonSelect.displayName = "NeonSelect";
export default NeonSelect;
