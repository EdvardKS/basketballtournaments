import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: ReactNode;
}

const NeonInput = forwardRef<HTMLInputElement, Props>(({
  label, hint, error, icon, className = "", id, ...rest
}, ref) => {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[10px] uppercase tracking-[0.25em] text-court-muted font-semibold">
          {label}
          {rest.required && <span className="text-[var(--color-neon-orange)] ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">{icon}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? "true" : "false"}
          className={`input-neon ${icon ? "pl-11" : ""} ${className}`}
          {...rest}
        />
      </div>
      {error
        ? <p className="text-[11px] text-[var(--color-neon-red)] font-medium pl-1">{error}</p>
        : hint && <p className="text-[11px] text-court-muted pl-1">{hint}</p>}
    </div>
  );
});
NeonInput.displayName = "NeonInput";
export default NeonInput;
