import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  type = "text",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={`flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#252B30] outline-none placeholder:text-gray-400 focus-visible:border-[#15966A] focus-visible:ring-2 focus-visible:ring-[#15966A]/20 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
