import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; helperText?: string; }
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, helperText, className = "", id, ...props }, ref) {
  return <label className="block space-y-2 text-sm text-white/80" htmlFor={id}>{label}<input ref={ref} id={id} className={`w-full border border-white/15 bg-slate-950/50 px-3 py-2.5 text-white outline-none transition focus:border-cyan-300 ${className}`} {...props} />{error ? <span className="block text-xs text-red-300">{error}</span> : helperText ? <span className="block text-xs text-white/45">{helperText}</span> : null}</label>;
});