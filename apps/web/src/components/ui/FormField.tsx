import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  description?: string;
  hint?: string;
  error?: string;
  locale?: 'ar' | 'en';
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function FormField({
  id,
  label,
  required,
  description,
  hint,
  error,
  locale = 'en',
  children,
  action,
  className,
}: Readonly<FormFieldProps>) {
  const isRTL = locale === 'ar';

  let helper: ReactNode = null;
  if (error) {
    helper = <p className="text-xs font-medium text-danger/80">{error}</p>;
  } else if (hint) {
    helper = <p className="text-xs text-white/50">{hint}</p>;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-medium text-white/90">
          {isRTL && required && <span className="mr-1 text-danger/80">*</span>}
          {label}
          {!isRTL && required && <span className="ml-1 text-danger/80">*</span>}
        </label>
        {action}
      </div>
      {description && <p className="text-xs text-white/60 leading-relaxed">{description}</p>}
      {children}
      {helper}
    </div>
  );
}
