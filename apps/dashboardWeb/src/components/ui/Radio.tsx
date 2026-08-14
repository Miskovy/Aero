import React from 'react';

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
  error?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
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
              type="radio"
              id={inputId}
              ref={ref}
              checked={checked}
              onChange={onChange}
              disabled={disabled}
              className="peer sr-only"
              {...props}
            />
            {/* Custom Radio Circle */}
            <div
              className={`w-4 h-4 rounded-full border transition-all duration-200 flex items-center justify-center
                bg-[#161a22] border-white/15
                peer-focus-visible:ring-2 peer-focus-visible:ring-[#38bdf8]/35 peer-focus-visible:border-[#38bdf8]
                peer-checked:border-[#38bdf8] peer-checked:bg-[#38bdf8]/10
                group-hover:border-white/30 peer-checked:group-hover:border-[#7dd3fc]
                ${error ? 'border-[#ef4444]/80' : ''} ${className}`}
            >
              {/* Inner Dot */}
              <div
                className={`w-2 h-2 rounded-full bg-[#38bdf8] transition-transform duration-150 shadow-2xs ${
                  checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                }`}
              />
            </div>
          </div>
          {label && (
            <div className="flex flex-col text-xs leading-normal">
              <span className="text-[#ccc8be] font-medium group-hover:text-[#f3f0ea] transition-colors">
                {label}
              </span>
              {description && (
                <span className="text-[#88909c] text-[11px] mt-0.5">{description}</span>
              )}
            </div>
          )}
        </label>
        {error && <span className="text-[#f87171] text-[11px] ml-6.5">{error}</span>}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  error,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={option.disabled}
          label={option.label}
          description={option.description}
        />
      ))}
      {error && <span className="text-[#f87171] text-xs">{error}</span>}
    </div>
  );
};
