// Equivalentes mínimos de los componentes shadcn (Button y Popover) que usaba el editor
// en portal_propio. Están construidos sobre @base-ui/react, igual que los originales.
import type { ComponentProps } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "./cn";

const variants = {
  default: "bg-blue-600 text-white hover:bg-blue-700",
  outline: "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
} as const;

const sizes = {
  default: "h-8 gap-1.5 px-2.5",
  sm: "h-7 gap-1 px-2.5 text-[0.8rem]",
} as const;

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <ButtonPrimitive
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  children,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Popup> & {
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner sideOffset={sideOffset} align={align} className="z-[9999]">
        <PopoverPrimitive.Popup
          className={cn(
            "w-72 rounded-md border border-slate-200 bg-white p-4 text-slate-700 shadow-md outline-none",
            className,
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
