"use client";

import React, { useId } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";
import type { SelectProps } from "@/types";

const sizeClasses = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-10 px-3 text-sm",
  lg: "h-12 px-4 text-base",
};

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

function CheckIcon() {
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
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select an option...",
  label,
  helperText,
  error,
  disabled,
  size = "md",
  name,
  required,
}: SelectProps) {
  const autoId = useId();
  const helperId = `${autoId}-helper`;
  const errorId = `${autoId}-error`;

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
        required={required}
      >
        <SelectPrimitive.Trigger
          aria-invalid={!!error || undefined}
          aria-describedby={
            [error && errorId, helperText && !error && helperId]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={cn(
            "inline-flex w-full items-center justify-between rounded-lg border bg-white transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400",
            "data-[placeholder]:text-neutral-400",
            error
              ? "border-error"
              : "border-neutral-300 hover:border-neutral-400",
            sizeClasses[size]
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronIcon className="text-neutral-400" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              "relative z-50 max-h-64 min-w-[8rem] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg",
              "data-[state=open]:animate-scale-in"
            )}
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-3 text-sm text-neutral-900 outline-none",
                    "focus:bg-primary-50 focus:text-primary-900",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  )}
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 flex items-center">
                    <CheckIcon />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-error" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-sm text-neutral-500">
          {helperText}
        </p>
      )}
    </div>
  );
}

Select.displayName = "Select";

export { Select };
