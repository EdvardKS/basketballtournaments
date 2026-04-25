import { useState, type ReactNode } from "react";

interface Props {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: ReactNode;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  minLength?: number;
  maxLength?: number;
  inputMode?: "text" | "email" | "tel" | "numeric";
  validate?: (v: string) => string | null;
  hint?: string;
  rightSlot?: ReactNode;
}

export default function NeonField({
  id, label, type = "text", value, onChange, placeholder, icon, required,
  autoComplete, autoFocus, minLength, maxLength, inputMode, validate, hint, rightSlot,
}: Props) {
  const [touched, setTouched] = useState(false);
  const error = touched && validate ? validate(value) : null;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[10px] uppercase tracking-[0.25em] text-court-muted font-semibold">
        {label}{required && <span className="text-[var(--color-neon-orange)] ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">{icon}</span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          minLength={minLength}
          maxLength={maxLength}
          inputMode={inputMode}
          aria-invalid={error ? "true" : "false"}
          className={`input-neon ${icon ? "pl-11" : ""} ${rightSlot ? "pr-11" : ""}`}
        />
        {rightSlot && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">{rightSlot}</span>
        )}
      </div>
      {error
        ? <p className="text-[11px] text-[var(--color-neon-red)] font-medium pl-1">{error}</p>
        : hint && <p className="text-[11px] text-court-muted pl-1">{hint}</p>}
    </div>
  );
}
