import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string | null;
}

const NeonTextarea = forwardRef<HTMLTextAreaElement, Props>(({
  label, hint, error, className = "", id, ...rest
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
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={error ? "true" : "false"}
        className={`input-neon resize-none ${className}`}
        {...rest}
      />
      {error
        ? <p className="text-[11px] text-[var(--color-neon-red)] font-medium pl-1">{error}</p>
        : hint && <p className="text-[11px] text-court-muted pl-1">{hint}</p>}
    </div>
  );
});
NeonTextarea.displayName = "NeonTextarea";
export default NeonTextarea;
