"use client";

import React, { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { BadgeProps } from "@/types";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-primary-100 text-primary-800",
        secondary: "bg-secondary-100 text-secondary-800",
        accent: "bg-accent-100 text-accent-800",
        success: "bg-success-100 text-success-800",
        warning: "bg-warning-100 text-warning-800",
        error: "bg-error-100 text-error-800",
        neutral: "bg-neutral-100 text-neutral-800",
      },
      size: {
        sm: "px-2 py-0.5 text-2xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  }
);

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant, size, dot, removable, onRemove, children, ...props },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {dot && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-current"
            aria-hidden="true"
          />
        )}
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current"
            aria-label="Remove"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
