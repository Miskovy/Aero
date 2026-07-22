import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  const hoverStyles = hoverable || onClick
    ? 'hover:border-slate-700 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-200 cursor-pointer'
    : '';

  return (
    <div
      onClick={onClick}
      className={`bg-[#111625]/80 backdrop-blur-xl border border-slate-800/80 rounded-xl p-5 shadow-sm ${hoverStyles} ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex items-center justify-between pb-4 border-b border-slate-800/60 mb-4 ${className}`}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-base font-semibold text-slate-100 ${className}`}>{children}</h3>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`pt-4 border-t border-slate-800/60 mt-4 flex items-center justify-end gap-3 ${className}`}>
    {children}
  </div>
);
