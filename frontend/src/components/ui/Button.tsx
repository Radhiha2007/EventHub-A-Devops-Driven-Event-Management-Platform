import { Link, type LinkProps } from 'react-router-dom'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'green' | 'blue' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-coral-600 text-white hover:bg-coral-700 border-transparent',
  green: 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent',
  blue: 'bg-blue-600 text-white hover:bg-blue-700 border-transparent',
  outline: 'bg-white text-charcoal border-charcoal/25 hover:border-charcoal hover:bg-cream-100',
  ghost: 'bg-transparent text-charcoal border-transparent hover:bg-charcoal/5',
  danger: 'bg-white text-coral-700 border-coral-600/40 hover:bg-coral-50',
}
const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-9',
  md: 'px-4 py-2.5 text-[15px] min-h-11',
  lg: 'px-6 py-3.5 text-base min-h-12',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-colors disabled:opacity-55 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${extra}`
}

interface Common {
  variant?: Variant
  size?: Size
  className?: string
  children?: ReactNode
}

export function Button({
  variant,
  size,
  className,
  loading,
  children,
  disabled,
  type = 'button',
  ...rest
}: Common & { loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  )
}

export function LinkButton({ variant, size, className, children, ...rest }: Common & LinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  )
}
