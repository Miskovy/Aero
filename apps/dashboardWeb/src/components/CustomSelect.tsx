'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export default function CustomSelect({ value, onChange, options, placeholder, disabled, style }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder || 'Select...';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-glass)',
          borderRadius: '6px',
          padding: '8px 32px 8px 12px',
          fontSize: '13px',
          color: value ? 'var(--text-primary)' : 'var(--text-dim)',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-sans)',
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color 0.2s ease',
          position: 'relative',
        }}
      >
        <span style={{ 
          display: 'block', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap' 
        }}>
          {selectedLabel}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-dim)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? '180deg' : '0deg'})`,
            transition: 'transform 0.2s ease',
            pointerEvents: 'none',
          }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-glass)',
            borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                color: opt.value === value ? 'var(--accent-cyan)' : 'var(--text-primary)',
                backgroundColor: opt.value === value ? 'rgba(56, 189, 248, 0.06)' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s ease',
                display: 'block',
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = opt.value === value ? 'rgba(56, 189, 248, 0.06)' : 'transparent';
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
