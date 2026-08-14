import React from 'react';

export type BadgeStatus =
  | 'running'
  | 'active'
  | 'online'
  | 'success'
  | 'stopped'
  | 'offline'
  | 'inactive'
  | 'failed'
  | 'error'
  | 'degraded'
  | 'warning'
  | 'deploying'
  | 'building'
  | 'pending'
  | 'neutral'
  | 'draining'
  | 'maintenance';

export interface BadgeProps {
  status?: BadgeStatus;
  label?: string;
  showPulse?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  status = 'neutral',
  label,
  showPulse = false,
  className = '',
  size = 'md',
}) => {
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  const statusColors: Record<BadgeStatus, { bg: string; text: string; border: string; pulse: string }> = {
    running: { bg: 'bg-[#10b981]/12', text: 'text-[#34d399]', border: 'border-[#10b981]/30', pulse: 'bg-[#10b981]' },
    active: { bg: 'bg-[#10b981]/12', text: 'text-[#34d399]', border: 'border-[#10b981]/30', pulse: 'bg-[#10b981]' },
    online: { bg: 'bg-[#10b981]/12', text: 'text-[#34d399]', border: 'border-[#10b981]/30', pulse: 'bg-[#10b981]' },
    success: { bg: 'bg-[#10b981]/12', text: 'text-[#34d399]', border: 'border-[#10b981]/30', pulse: 'bg-[#10b981]' },

    stopped: { bg: 'bg-[#565f6c]/12', text: 'text-[#a2aab5]', border: 'border-[#565f6c]/25', pulse: 'bg-[#88909c]' },
    offline: { bg: 'bg-[#565f6c]/12', text: 'text-[#a2aab5]', border: 'border-[#565f6c]/25', pulse: 'bg-[#88909c]' },
    inactive: { bg: 'bg-[#565f6c]/12', text: 'text-[#a2aab5]', border: 'border-[#565f6c]/25', pulse: 'bg-[#88909c]' },
    neutral: { bg: 'bg-[#565f6c]/12', text: 'text-[#ccc8be]', border: 'border-[#565f6c]/25', pulse: 'bg-[#88909c]' },

    failed: { bg: 'bg-[#ef4444]/12', text: 'text-[#f87171]', border: 'border-[#ef4444]/30', pulse: 'bg-[#ef4444]' },
    error: { bg: 'bg-[#ef4444]/12', text: 'text-[#f87171]', border: 'border-[#ef4444]/30', pulse: 'bg-[#ef4444]' },

    degraded: { bg: 'bg-[#f59e0b]/12', text: 'text-[#fbbf24]', border: 'border-[#f59e0b]/30', pulse: 'bg-[#f59e0b]' },
    warning: { bg: 'bg-[#f59e0b]/12', text: 'text-[#fbbf24]', border: 'border-[#f59e0b]/30', pulse: 'bg-[#f59e0b]' },
    draining: { bg: 'bg-[#f59e0b]/12', text: 'text-[#fbbf24]', border: 'border-[#f59e0b]/30', pulse: 'bg-[#f59e0b]' },
    maintenance: { bg: 'bg-[#f59e0b]/12', text: 'text-[#fbbf24]', border: 'border-[#f59e0b]/30', pulse: 'bg-[#f59e0b]' },

    deploying: { bg: 'bg-[#38bdf8]/12', text: 'text-[#38bdf8]', border: 'border-[#38bdf8]/30', pulse: 'bg-[#38bdf8]' },
    building: { bg: 'bg-[#0ea5e9]/12', text: 'text-[#38bdf8]', border: 'border-[#0ea5e9]/30', pulse: 'bg-[#0ea5e9]' },
    pending: { bg: 'bg-[#38bdf8]/12', text: 'text-[#38bdf8]', border: 'border-[#38bdf8]/30', pulse: 'bg-[#38bdf8]' },
  };

  const style = statusColors[status] || statusColors.neutral;
  const isPulseActive = showPulse || ['running', 'active', 'online', 'deploying', 'building'].includes(status);
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border backdrop-blur-xs shadow-2xs ${style.bg} ${style.text} ${style.border} ${sizeClass} ${className}`}
    >
      {isPulseActive && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-70 ${style.pulse}`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${style.pulse}`} />
        </span>
      )}
      <span>{displayLabel}</span>
    </span>
  );
};
