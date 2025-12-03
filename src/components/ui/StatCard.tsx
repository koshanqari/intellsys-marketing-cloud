import { ReactNode } from 'react';
import Card from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export default function StatCard({ title, value, subtitle, icon, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'text-[var(--primary)]',
    success: 'text-[var(--success)]',
    warning: 'text-[var(--warning)]',
    error: 'text-[var(--error)]',
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--neutral-600)]">{title}</p>
          <p className={`mt-2 text-3xl font-semibold ${variantStyles[variant]}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--neutral-400)]">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`p-2 rounded-lg bg-[var(--primary-light)] ${variantStyles[variant]}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

