import type { LabelHTMLAttributes } from "react";

export function Label({
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`text-sm font-medium leading-none text-[#252B30] ${className}`}
      {...props}
    />
  );
}
