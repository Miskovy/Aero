import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0b0d11] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] select-none';

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#38bdf8] to-[#0284c7] hover:from-[#7dd3fc] hover:to-[#0369a1] text-[#081018] font-semibold shadow-xs hover:shadow-sm focus:ring-[#38bdf8] border border-[#38bdf8]/40',
    secondary:
      'bg-[#161a22] hover:bg-[#1f2430] text-[#ded9cf] border border-white/10 hover:border-white/20 shadow-xs focus:ring-slate-400 backdrop-blur-md',
    danger:
      'bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-xs focus:ring-[#ef4444] border border-[#ef4444]/40',
    success:
      'bg-[#10b981] hover:bg-[#059669] text-white shadow-xs focus:ring-[#10b981] border border-[#10b981]/40',
    ghost: 'bg-transparent hover:bg-white/5 text-[#ccc8be] hover:text-white focus:ring-slate-400',
    outline:
      'bg-transparent border border-[#38bdf8]/35 hover:border-[#38bdf8]/70 text-[#38bdf8] hover:bg-[#38bdf8]/10 focus:ring-[#38bdf8] shadow-xs',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 font-medium',
    md: 'px-4 py-2 text-sm gap-2 font-medium',
    lg: 'px-5 py-2.5 text-base gap-2.5 font-semibold',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : icon ? (
        <span className="shrink-0 flex items-center justify-center">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
