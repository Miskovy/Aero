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
  const hoverStyles =
    hoverable || onClick
      ? 'hover:border-[#38bdf8]/35 hover:shadow-md hover:shadow-black/40 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer'
      : 'transition-all duration-200';

  return (
    <div
      onClick={onClick}
      className={`bg-[#11141a]/90 backdrop-blur-xl border border-white/[0.07] rounded-2xl p-6 shadow-xs shadow-black/30 relative overflow-hidden ${hoverStyles} ${className}`}
    >
      {/* Top subtle rim highlight for matte depth */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent pointer-events-none" />
      {/* Soft atmospheric cyan ambient wash inside card */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-[#38bdf8]/[0.018] rounded-full blur-2xl pointer-events-none" />
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4 ${className}`}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <h3 className={`text-sm font-semibold text-[#f3f0ea] tracking-tight flex items-center gap-2 font-title ${className}`}>
    {children}
  </h3>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`relative z-1 ${className}`}>{children}</div>;

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`pt-4 border-t border-white/[0.06] mt-4 flex items-center justify-end gap-3 ${className}`}>
    {children}
  </div>
);
