import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[84px] max-h-[240px] w-full rounded-field border border-input bg-surface px-3.5 py-[11px] text-sm text-text transition-colors outline-none",
        "placeholder:text-[#a7ada6]",
        "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/12",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/12",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
