import React from 'react';

export interface LoadingSkeletonProps {
  count?: number;
  height?: string;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  count = 3,
  height = 'h-16',
  className = '',
}) => {
  return (
    <div className="space-y-3 w-full animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`w-full bg-slate-800/40 border border-slate-800/60 rounded-xl ${height} ${className}`}
        />
      ))}
    </div>
  );
};
