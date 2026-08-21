"use client";

import React, { useId } from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";
import type { RadioGroupProps } from "@/types";

function RadioGroup({
  options,
  value,
  defaultValue,
  onValueChange,
  label,
  orientation = "vertical",
  disabled,
  name,
  required,
}: RadioGroupProps) {
  const groupId = useId();

  return (
    <fieldset className="w-full" disabled={disabled}>
      {label && (
        <legend className="mb-2 text-sm font-medium text-neutral-700">
          {label}
        </legend>
      )}
      <RadioGroupPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        orientation={orientation}
        name={name}
        required={required}
        className={cn(
          "flex gap-3",
          orientation === "vertical" ? "flex-col" : "flex-row flex-wrap"
        )}
      >
        {options.map((option) => {
          const itemId = `${groupId}-${option.value}`;
          return (
            <div key={option.value} className="flex items-start gap-3">
              <RadioGroupPrimitive.Item
                id={itemId}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "data-[state=checked]:border-primary",
                  "hover:border-neutral-400"
                )}
              >
                <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                  <span className="block h-2.5 w-2.5 rounded-full bg-primary" />
                </RadioGroupPrimitive.Indicator>
              </RadioGroupPrimitive.Item>
              <div className="flex flex-col">
                <label
                  htmlFor={itemId}
                  className={cn(
                    "text-sm font-medium text-neutral-900",
                    option.disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  {option.label}
                </label>
                {option.description && (
                  <span
                    className={cn(
                      "text-sm text-neutral-500",
                      option.disabled && "opacity-50"
                    )}
                  >
                    {option.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </RadioGroupPrimitive.Root>
    </fieldset>
  );
}

RadioGroup.displayName = "RadioGroup";

export { RadioGroup };
