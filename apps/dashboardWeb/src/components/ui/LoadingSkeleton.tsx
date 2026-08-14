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
    <div className="space-y-3 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`w-full bg-gradient-to-r from-white/[0.03] via-white/[0.07] to-white/[0.03] border border-white/[0.05] rounded-2xl animate-pulse ${height} ${className}`}
        />
      ))}
    </div>
  );
};
