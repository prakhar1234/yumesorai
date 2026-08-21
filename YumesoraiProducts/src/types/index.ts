import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  PropsWithChildren
} from "react";

// ════════════════════════════════════════════════════════════════════════════
// INPUT COMPONENT TYPES
// ════════════════════════════════════════════════════════════════════════════

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string;
  helperText?: string;
  error?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  size?: "sm" | "md" | "lg";
};

// ════════════════════════════════════════════════════════════════════════════
// TEXTAREA COMPONENT TYPES
// ════════════════════════════════════════════════════════════════════════════

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> & {
  label?: string;
  helperText?: string;
  error?: string;
  size?: "sm" | "md" | "lg";
  resize?: "none" | "vertical" | "horizontal" | "both";
};

// ════════════════════════════════════════════════════════════════════════════
// SELECT COMPONENT TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  name?: string;
  required?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// BUTTON COMPONENT TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | null;
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// CARD COMPONENT TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface CardProps extends PropsWithChildren {
  variant?: "outlined" | "filled" | "elevated";
  className?: string;
  padding?: "sm" | "md" | "lg";
  hoverable?: boolean;
}

export interface CardHeaderProps extends PropsWithChildren {
  className?: string;
}

export interface CardBodyProps extends PropsWithChildren {
  className?: string;
}

export interface CardFooterProps extends PropsWithChildren {
  className?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// BADGE COMPONENT TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface BadgeProps extends PropsWithChildren {
  variant?: "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "neutral" | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
// CHECKBOX COMPONENT TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface CheckboxProps {
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  required?: boolean;
  id?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// RADIO COMPONENT TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  name?: string;
  required?: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// ACCORDION COMPONENT TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface AccordionItem {
  value: string;
  trigger: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface AccordionProps extends PropsWithChildren {
  items: AccordionItem[];
  type?: "single" | "multiple";
  collapsible?: boolean;
  defaultValue?: string | string[];
  className?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// TABS COMPONENT TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface TabItem {
  value: string;
  label?: string;
  trigger?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps extends PropsWithChildren {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// TOOLTIP COMPONENT TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface TooltipProps extends PropsWithChildren {
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  className?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL COMPONENT TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface ModalProps extends PropsWithChildren {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export interface ModalContentProps extends PropsWithChildren {
  className?: string;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
}
