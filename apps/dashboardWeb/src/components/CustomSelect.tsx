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
          backgroundColor: 'rgba(22, 26, 34, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '7px 32px 7px 12px',
          fontSize: '12.5px',
          fontWeight: 500,
          color: value ? '#f3f0ea' : '#88909c',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-sans)',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          boxShadow: isOpen ? '0 0 0 3px rgba(56, 189, 248, 0.14)' : 'none',
          borderColor: isOpen ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
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
          stroke="#88909c"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? '180deg' : '0deg'})`,
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            backgroundColor: 'rgba(22, 26, 34, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.65), 0 0 1px 1px rgba(255, 255, 255, 0.04)',
            zIndex: 999,
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '5px',
            animation: 'fadeIn 0.15s ease',
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
                padding: '7.5px 12px',
                fontSize: '12.5px',
                fontWeight: opt.value === value ? 600 : 400,
                fontFamily: 'var(--font-sans)',
                color: opt.value === value ? '#38bdf8' : '#ccc8be',
                backgroundColor: opt.value === value ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = '#f3f0ea';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = opt.value === value ? 'rgba(56, 189, 248, 0.12)' : 'transparent';
                e.currentTarget.style.color = opt.value === value ? '#38bdf8' : '#ccc8be';
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
              {opt.value === value && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: '8px' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
