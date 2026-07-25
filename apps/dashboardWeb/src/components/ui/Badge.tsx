import React from 'react';

export type BadgeStatus = 'running' | 'active' | 'online' | 'success' | 'stopped' | 'offline' | 'inactive' | 'failed' | 'error' | 'degraded' | 'warning' | 'deploying' | 'building' | 'pending' | 'neutral' | 'draining' | 'maintenance';

export interface BadgeProps {
  status?: BadgeStatus;
  label?: string;
  showPulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status = 'neutral',
  label,
  showPulse = false,
  className = '',
}) => {
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  const statusColors: Record<BadgeStatus, { bg: string; text: string; border: string; pulse: string }> = {
    running: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', pulse: 'bg-emerald-400' },
    active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', pulse: 'bg-emerald-400' },
    online: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', pulse: 'bg-emerald-400' },
    success: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', pulse: 'bg-emerald-400' },
    
    stopped: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', pulse: 'bg-slate-400' },
    offline: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', pulse: 'bg-slate-400' },
    inactive: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', pulse: 'bg-slate-400' },
    neutral: { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/30', pulse: 'bg-slate-400' },

    failed: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', pulse: 'bg-rose-400' },
    error: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', pulse: 'bg-rose-400' },

    degraded: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', pulse: 'bg-amber-400' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', pulse: 'bg-amber-400' },
    draining: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', pulse: 'bg-amber-400' },
    maintenance: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', pulse: 'bg-amber-400' },

    deploying: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', pulse: 'bg-cyan-400' },
    building: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30', pulse: 'bg-indigo-400' },
    pending: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', pulse: 'bg-cyan-400' },
  };

  const style = statusColors[status] || statusColors.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {(showPulse || ['running', 'active', 'online', 'deploying', 'building'].includes(status)) && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.pulse}`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${style.pulse}`} />
        </span>
      )}
      {displayLabel}
    </span>
  );
};
