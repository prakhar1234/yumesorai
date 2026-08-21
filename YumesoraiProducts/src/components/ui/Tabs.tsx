"use client";

import React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import type { TabsProps } from "@/types";

function Tabs({
  items,
  defaultValue,
  value,
  onValueChange,
  orientation = "horizontal",
  className,
}: TabsProps) {
  const resolvedDefault = defaultValue || items[0]?.value;

  return (
    <TabsPrimitive.Root
      defaultValue={resolvedDefault}
      value={value}
      onValueChange={onValueChange}
      orientation={orientation}
      className={cn(
        "w-full",
        orientation === "vertical" && "flex gap-4",
        className
      )}
    >
      <TabsPrimitive.List
        className={cn(
          "flex shrink-0",
          orientation === "horizontal"
            ? "border-b border-neutral-200"
            : "flex-col border-r border-neutral-200"
        )}
        aria-orientation={orientation}
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium text-neutral-500 transition-colors",
              "hover:text-neutral-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:rounded-sm",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "data-[state=active]:text-primary",
              orientation === "horizontal" &&
                "data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary",
              orientation === "vertical" &&
                "data-[state=active]:after:absolute data-[state=active]:after:right-0 data-[state=active]:after:top-0 data-[state=active]:after:bottom-0 data-[state=active]:after:w-0.5 data-[state=active]:after:bg-primary text-left"
            )}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          key={item.value}
          value={item.value}
          className={cn(
            "mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:rounded-sm",
            orientation === "vertical" && "mt-0 flex-1"
          )}
        >
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

Tabs.displayName = "Tabs";

export { Tabs };
