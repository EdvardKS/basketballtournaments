import { forwardRef, type ButtonHTMLAttributes } from "react";

export type NeonButtonVariant = "primary" | "blue" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NeonButtonVariant;
  size?: "sm" | "md";
}

const VARIANT_CLASS: Record<NeonButtonVariant, string> = {
  primary: "neon-btn-primary",
  blue:    "neon-btn-blue",
  ghost:   "neon-btn-ghost",
  danger:  "neon-btn-danger",
};

const NeonButton = forwardRef<HTMLButtonElement, Props>(({
  variant = "primary", size = "md", className = "", onMouseMove, ...rest
}, ref) => {
  const sizeCls = size === "sm" ? "text-[10px] px-3 py-1.5" : "";
  // Hover-ripple: store cursor position as CSS vars so the ::before
  // gradient follows the mouse.
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--rx", `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty("--ry", `${((e.clientY - r.top) / r.height) * 100}%`);
    onMouseMove?.(e);
  };
  return (
    <button
      ref={ref}
      className={`neon-btn ${VARIANT_CLASS[variant]} ${sizeCls} ${className}`}
      onMouseMove={handleMouseMove}
      {...rest}
    />
  );
});
NeonButton.displayName = "NeonButton";
export default NeonButton;
