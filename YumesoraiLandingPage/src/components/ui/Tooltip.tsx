"use client";

import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import type { TooltipProps } from "@/types";

function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration,
  className,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            "z-50 max-w-xs rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white shadow-md",
            "animate-fade-in",
            className
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-neutral-900" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

Tooltip.displayName = "Tooltip";
TooltipProvider.displayName = "TooltipProvider";

export { Tooltip, TooltipProvider };
