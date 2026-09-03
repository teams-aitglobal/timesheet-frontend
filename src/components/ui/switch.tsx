import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5.5 w-10 shrink-0 items-center rounded-full outline-none transition-colors",
        "data-[state=checked]:bg-badge-active-text data-[state=unchecked]:bg-input",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-surface shadow-sm transition-transform",
          "translate-x-0.5 data-[state=checked]:translate-x-[19px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
