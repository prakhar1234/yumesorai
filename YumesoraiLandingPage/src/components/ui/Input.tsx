"use client";

import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import type { InputProps } from "@/types";

const sizeClasses = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-10 px-3 text-sm",
  lg: "h-12 px-4 text-base",
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      size = "md",
      label,
      helperText,
      error,
      leftAddon,
      rightAddon,
      disabled,
      id: providedId,
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const id = providedId || autoId;
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-medium text-neutral-700"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftAddon && (
            <span className="pointer-events-none absolute left-3 text-neutral-400">
              {leftAddon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            type={type}
            disabled={disabled}
            aria-invalid={!!error || undefined}
            aria-describedby={
              [error && errorId, helperText && !error && helperId]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={cn(
              "w-full rounded-lg border bg-white transition-colors duration-150",
              "placeholder:text-neutral-400",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1",
              "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400",
              error
                ? "border-error text-error-900"
                : "border-neutral-300 text-neutral-900 hover:border-neutral-400",
              sizeClasses[size],
              leftAddon && "pl-9",
              rightAddon && "pr-9",
              className
            )}
            {...props}
          />
          {rightAddon && (
            <span className="pointer-events-none absolute right-3 text-neutral-400">
              {rightAddon}
            </span>
          )}
        </div>
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
);

Input.displayName = "Input";

export { Input };
