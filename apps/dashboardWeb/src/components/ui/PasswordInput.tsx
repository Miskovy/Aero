import React, { useState } from 'react';
import Link from 'next/link';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  showForgotPassword?: boolean;
  forgotPasswordHref?: string;
  error?: string | null;
  helperText?: string;
  containerClassName?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label = 'Password',
      showForgotPassword = false,
      forgotPasswordHref = '/forgot-password',
      error,
      helperText,
      containerClassName = '',
      className = '',
      id,
      placeholder = '••••••••••••',
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={inputId}
              className="text-xs font-semibold text-[#ccc8be] select-none"
            >
              {label}
            </label>
          )}
          {showForgotPassword && (
            <Link
              href={forgotPasswordHref}
              className="text-xs font-medium text-[#38bdf8] hover:text-[#7dd3fc] transition-colors select-none"
              tabIndex={-1}
            >
              Forgot?
            </Link>
          )}
        </div>

        <div className="relative w-full">
          <input
            ref={ref}
            id={inputId}
            type={isVisible ? 'text' : 'password'}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full pr-10 transition-colors ${
              error ? 'border-[#ef4444]/80 focus:border-[#ef4444]' : ''
            } ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setIsVisible((prev) => !prev)}
            disabled={disabled}
            tabIndex={-1}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-[#88909c] hover:text-[#ccc8be] focus:outline-none transition-colors rounded-md disabled:opacity-50 cursor-pointer flex items-center justify-center bg-transparent border-0"
          >
            {isVisible ? (
              /* Eye-Off Icon */
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            ) : (
              /* Eye Icon */
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {error && (
          <span className="text-[11.5px] text-[#f87171] leading-tight">
            {error}
          </span>
        )}

        {helperText && !error && (
          <span className="text-[11.5px] text-[#88909c] leading-tight">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
