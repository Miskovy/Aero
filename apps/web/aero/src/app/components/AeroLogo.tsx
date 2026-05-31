import React from 'react'

interface AeroLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  monochrome?: boolean
}

export default function AeroLogo({
  size = 24,
  monochrome = false,
  className = '',
  ...props
}: AeroLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={monochrome ? 'currentColor' : '#38bdf8'}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M2 12L22 2L17 22L12 14L2 12Z" strokeWidth="1.5" />
      <path d="M22 2L12 14" strokeWidth="1.5" />
    </svg>
  )
}
