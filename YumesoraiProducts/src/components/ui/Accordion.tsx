"use client";

import React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cn } from "@/lib/utils";
import type { AccordionProps } from "@/types";

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Accordion({
  items,
  type = "single",
  defaultValue,
  collapsible = true,
  className,
}: AccordionProps) {
  const rootProps =
    type === "single"
      ? {
          type: "single" as const,
          defaultValue: defaultValue as string | undefined,
          collapsible,
        }
      : {
          type: "multiple" as const,
          defaultValue: defaultValue as string[] | undefined,
        };

  return (
    <AccordionPrimitive.Root {...rootProps} className={cn("w-full", className)}>
      {items.map((item) => (
        <AccordionPrimitive.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          className="border-b border-neutral-200"
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger
              className={cn(
                "flex w-full items-center justify-between py-4 text-left text-sm font-medium text-neutral-900 transition-colors",
                "hover:text-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:rounded-sm",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "[&[data-state=open]>svg]:rotate-180"
              )}
            >
              {item.trigger}
              <ChevronIcon className="shrink-0 text-neutral-400 transition-transform duration-200" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content
            className={cn(
              "overflow-hidden text-sm text-neutral-600",
              "data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
            )}
          >
            <div className="pb-4">{item.content}</div>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}

Accordion.displayName = "Accordion";

export { Accordion };
