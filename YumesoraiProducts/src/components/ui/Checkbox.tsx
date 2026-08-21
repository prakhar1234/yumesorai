"use client";

import React, { useId } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "@/lib/utils";
import type { CheckboxProps } from "@/types";

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function Checkbox({
  checked,
  defaultChecked,
  onCheckedChange,
  label,
  description,
  disabled,
  name,
  value,
  required,
  id: providedId,
}: CheckboxProps) {
  const autoId = useId();
  const id = providedId || autoId;

  return (
    <div className="flex items-start gap-3">
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        name={name}
        value={value}
        required={required}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border border-neutral-300 bg-white transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white",
          "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white",
          "hover:border-neutral-400 data-[state=checked]:hover:bg-primary-700"
        )}
      >
        <CheckboxPrimitive.Indicator>
          {checked === "indeterminate" ? <MinusIcon /> : <CheckIcon />}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label
              htmlFor={id}
              className={cn(
                "text-sm font-medium text-neutral-900",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <span
              className={cn(
                "text-sm text-neutral-500",
                disabled && "opacity-50"
              )}
            >
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

Checkbox.displayName = "Checkbox";

export { Checkbox };
