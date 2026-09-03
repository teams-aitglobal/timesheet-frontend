import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-field border border-input bg-surface px-3.5 py-[11px] text-sm text-text transition-colors outline-none",
        "placeholder:text-[#a7ada6]",
        "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/12",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/12",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&::-webkit-credentials-auto-fill-button]:hidden [&::-webkit-strong-password-auto-fill-button]:hidden",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
