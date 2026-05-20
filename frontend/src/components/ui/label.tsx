import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  ref,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & {
  ref?: React.Ref<HTMLLabelElement>;
}) {
  return (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium text-zinc-800 dark:text-zinc-200",
        className,
      )}
      {...props}
    />
  );
}
