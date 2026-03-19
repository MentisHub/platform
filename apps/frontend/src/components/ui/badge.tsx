import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-sm border px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] uppercase whitespace-nowrap transition-[color,box-shadow] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary border-transparent text-primary-foreground [a&]:hover:bg-primary/90",
        secondary: "bg-secondary border-transparent text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive: "bg-destructive border-transparent text-white [a&]:hover:bg-destructive/90",
        outline: "border-border text-foreground",
        success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
        warning: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
        danger: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
        muted: "bg-surface-1 text-text-secondary border-border-subtle opacity-60",
        amber: "border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const amberStyle = {
  background: "var(--badge-amber-bg)",
  borderColor: "var(--badge-amber-border)",
  color: "var(--badge-amber-text)",
}

const dotColorMap: Record<string, string> = {
  success: "bg-emerald-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
  amber: "bg-amber-400",
  muted: "bg-muted-foreground",
  default: "bg-primary-foreground",
}

function Badge({
  className,
  variant = "default",
  asChild = false,
  dot,
  pulse,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
    dot?: boolean
    pulse?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      style={variant === "amber" ? amberStyle : undefined}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full shrink-0",
            pulse && "animate-pulse",
            dotColorMap[variant ?? "default"],
          )}
        />
      )}
      {props.children}
    </Comp>
  )
}

export { Badge, badgeVariants }
