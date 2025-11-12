import * as React from "react";
import { Slot as SlotPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.98]",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90 hover:shadow-md active:scale-[0.98] focus-visible:ring-destructive/20",
        outline:
          "border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 active:scale-[0.98]",
        secondary:
          "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98]",
        ghost:
          "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-9 rounded-lg gap-1.5 px-4 has-[>svg]:px-3 text-sm",
        lg: "h-12 rounded-lg px-8 has-[>svg]:px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? SlotPrimitive.Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
