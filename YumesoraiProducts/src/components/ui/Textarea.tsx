"use client";

import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import type { TextareaProps } from "@/types";

const sizeClasses = {
  sm: "px-2.5 py-1.5 text-sm min-h-[64px]",
  md: "px-3 py-2 text-sm min-h-[80px]",
  lg: "px-4 py-3 text-base min-h-[100px]",
};

const resizeClasses = {
  none: "resize-none",
  vertical: "resize-y",
  horizontal: "resize-x",
  both: "resize",
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      size = "md",
      label,
      helperText,
      error,
      resize = "vertical",
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
        <textarea
          ref={ref}
          id={id}
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
            resizeClasses[resize],
            className
          )}
          {...props}
        />
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

Textarea.displayName = "Textarea";

export { Textarea };
