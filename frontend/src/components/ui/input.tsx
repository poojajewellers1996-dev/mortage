import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onWheel, onKeyDown, ...props }, ref) => {
    return (
      <input
        type={type}
        onWheel={(e) => {
          if (type === "number") {
            // Prevent mouse wheel scrolling from changing the number value
            (e.target as HTMLElement).blur();
          }
          onWheel?.(e);
        }}
        onKeyDown={(e) => {
          // Prevent arrow up/down keys from changing the fixed number value
          if (type === "number" && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
          }
          onKeyDown?.(e);
        }}
        className={cn(
          "flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
