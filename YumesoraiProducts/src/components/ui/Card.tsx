import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps } from "@/types";

const variantClasses = {
  elevated: "border border-neutral-200 bg-white shadow-md",
  outlined: "border border-neutral-200 bg-white",
  filled: "border-0 bg-neutral-50",
};

const paddingClasses = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "elevated",
      padding = "md",
      hoverable = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl transition-shadow duration-200",
          variantClasses[variant],
          paddingClasses[padding],
          hoverable && "hover:shadow-lg cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mb-4 flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  )
);

const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("text-neutral-700", className)} {...props}>
      {children}
    </div>
  )
);

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "mt-4 flex items-center justify-end gap-3 border-t border-neutral-100 pt-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = "Card";
CardHeader.displayName = "CardHeader";
CardBody.displayName = "CardBody";
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardBody, CardFooter };
