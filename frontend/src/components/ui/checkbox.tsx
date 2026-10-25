import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

export function Checkbox({
  className = "",
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-400 bg-white text-white data-[state=checked]:border-[#15966A] data-[state=checked]:bg-[#15966A] ${className}`}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check size={12} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
