import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/[0.08] rounded-2xl bg-[#11141a]/60 backdrop-blur-xs">
      {icon ? (
        <div className="p-4 bg-[#161a22] border border-white/[0.08] rounded-2xl text-[#ccc8be] mb-4 shadow-xs">
          {icon}
        </div>
      ) : (
        <div className="p-4 bg-[#38bdf8]/10 border border-[#38bdf8]/20 rounded-2xl text-[#38bdf8] mb-4 shadow-xs">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
      )}
      <h3 className="text-sm font-semibold text-[#f3f0ea] mb-1 font-title">{title}</h3>
      <p className="text-xs text-[#88909c] max-w-md mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
