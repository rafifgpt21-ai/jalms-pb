import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default:
          "border border-primary bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 dark:border-primary/70 dark:bg-primary/80 dark:hover:bg-primary/95 active:translate-y-px",
        destructive:
          "border border-destructive bg-destructive text-white shadow-xs hover:bg-destructive/90 dark:border-destructive/70 dark:bg-destructive/80 dark:hover:bg-destructive/95 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 active:translate-y-px",
        outline:
          "border border-input bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground active:translate-y-px",
        secondary:
          "border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 active:translate-y-px",
        ghost:
          "border border-transparent hover:bg-accent hover:text-accent-foreground active:translate-y-px",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-4 has-[>svg]:px-3.5",
        sm: "h-7 px-3.5 text-xs has-[>svg]:px-3",
        lg: "h-9 px-5 has-[>svg]:px-4",
        icon: "size-8",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
