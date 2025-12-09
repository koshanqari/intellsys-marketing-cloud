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
  customColor?: string;
}

export default function StatCard({ title, value, subtitle, icon, variant = 'default', customColor }: StatCardProps) {
  const variantStyles = {
    default: 'text-[var(--primary)]',
    success: 'text-[var(--success)]',
    warning: 'text-[var(--warning)]',
    error: 'text-[var(--error)]',
  };

  const getIconBgColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, 0.1)`;
  };
  
  const iconBgColor = customColor ? getIconBgColor(customColor) : undefined;

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--neutral-600)]">{title}</p>
          <p 
            className={`mt-2 text-3xl font-semibold ${!customColor ? variantStyles[variant] : ''}`}
            style={customColor ? { color: customColor } : undefined}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--neutral-400)]">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div 
            className={`p-2 rounded-lg ${!customColor ? `bg-[var(--primary-light)] ${variantStyles[variant]}` : ''}`}
            style={customColor ? { backgroundColor: iconBgColor, color: customColor } : undefined}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

