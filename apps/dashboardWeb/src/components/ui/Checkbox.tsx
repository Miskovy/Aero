import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className = '', checked, onChange, disabled, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={inputId}
          className={`inline-flex items-start gap-2.5 cursor-pointer select-none group ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className="relative flex items-center justify-center mt-0.5 shrink-0">
            <input
              type="checkbox"
              id={inputId}
              ref={ref}
              checked={checked}
              onChange={onChange}
              disabled={disabled}
              className="peer sr-only"
              {...props}
            />
            {/* Custom Checkbox Box */}
            <div
              className={`w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center
                bg-slate-900/90 border-slate-700/80
                peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-500/40 peer-focus-visible:border-cyan-500
                peer-checked:bg-cyan-500 peer-checked:border-cyan-500 peer-checked:text-slate-950
                group-hover:border-slate-500 peer-checked:group-hover:border-cyan-400
                ${error ? 'border-rose-500/80' : ''} ${className}`}
            >
              <svg
                className={`w-3 h-3 transition-transform duration-150 stroke-current ${
                  checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.5 7L5.5 10L11.5 4"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          {label && (
            <div className="flex flex-col text-xs leading-normal">
              <span className="text-slate-300 font-medium group-hover:text-slate-200 transition-colors">
                {label}
              </span>
              {description && (
                <span className="text-slate-500 text-[11px] mt-0.5">{description}</span>
              )}
            </div>
          )}
        </label>
        {error && <span className="text-rose-400 text-[11px] ml-6.5">{error}</span>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
