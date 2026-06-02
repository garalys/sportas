import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export function StatCard({
  label,
  value,
  unit,
  icon,
  accent = 'text-brand-600',
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="card flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        {icon && <span className={cn('shrink-0', accent)}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}
