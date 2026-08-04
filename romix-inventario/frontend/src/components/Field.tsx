import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

export const Field = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string }>(
  ({ label, className, ...props }, ref) => (
  <label className={['grid gap-1 text-sm font-medium text-slate-700', className].filter(Boolean).join(' ')}>
    {label}
    <input
      ref={ref}
      className="min-h-10 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
      {...props}
    />
  </label>
  )
);

Field.displayName = 'Field';

export const SelectField = ({
  label,
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) => (
  <label className={['grid gap-1 text-sm font-medium text-slate-700', className].filter(Boolean).join(' ')}>
    {label}
    <select
      className="min-h-10 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
      {...props}
    >
      {children}
    </select>
  </label>
);

export const TextareaField = ({
  label,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => (
  <label className={['grid gap-1 text-sm font-medium text-slate-700', className].filter(Boolean).join(' ')}>
    {label}
    <textarea
      className="min-h-24 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
      {...props}
    />
  </label>
);
