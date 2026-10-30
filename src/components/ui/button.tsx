import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[transform,background-color,box-shadow,color] duration-200 ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "bg-spectrum text-white shadow-[0_10px_30px_-10px_rgba(106,85,255,0.9),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_14px_40px_-10px_rgba(79,139,255,0.95),inset_0_1px_0_rgba(255,255,255,0.4)]",
  secondary:
    "glass text-mist-50 hover:bg-white/[0.09]",
  ghost: "text-mist-200 hover:bg-white/[0.06] hover:text-mist-50",
  danger: "bg-warn text-ink-950 hover:bg-warn/90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function buttonClasses({ variant = "primary", size = "md", className }: Omit<StyleProps, "children">) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  children,
  type = "button",
  ...props
}: StyleProps & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button type={type} className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: StyleProps & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
