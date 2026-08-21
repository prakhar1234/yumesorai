"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import type { ModalProps, ModalContentProps } from "@/types";

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[calc(100vw-2rem)]",
};

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function Modal({ open, onOpenChange, children }: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

function ModalTrigger({ children, ...props }: DialogPrimitive.DialogTriggerProps) {
  return (
    <DialogPrimitive.Trigger asChild {...props}>
      {children}
    </DialogPrimitive.Trigger>
  );
}

function ModalContent({
  title,
  description,
  children,
  className,
  size = "md",
}: ModalContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-6 shadow-xl",
          "data-[state=open]:animate-scale-in",
          "focus-visible:outline-none",
          sizeClasses[size],
          className
        )}
      >
        <DialogPrimitive.Title className="text-lg font-semibold text-neutral-900">
          {title}
        </DialogPrimitive.Title>
        {description && (
          <DialogPrimitive.Description className="mt-1 text-sm text-neutral-500">
            {description}
          </DialogPrimitive.Description>
        )}
        <div className="mt-4">{children}</div>
        <DialogPrimitive.Close
          className={cn(
            "absolute right-4 top-4 rounded-md p-1 text-neutral-400 transition-colors",
            "hover:bg-neutral-100 hover:text-neutral-600",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          )}
          aria-label="Close"
        >
          <CloseIcon />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

Modal.displayName = "Modal";
ModalTrigger.displayName = "ModalTrigger";
ModalContent.displayName = "ModalContent";

export { Modal, ModalTrigger, ModalContent };
