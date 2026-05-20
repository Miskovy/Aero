'use client'

import { useRevealOnReturn } from '../hooks/useRevealOnReturn'

const STEPS = [
  {
    number: '01',
    title: 'Install',
    desc: 'One command to get started. Works on any machine with Docker installed.',
    code: '$ npm install -g aerodeploy',
    icon: 'download',
  },
  {
    number: '02',
    title: 'Deploy',
    desc: 'Interactive CLI guides you through setup. Git repos, Docker images, or Compose files.',
    code: '$ aero deploy',
    icon: 'rocket',
  },
  {
    number: '03',
    title: 'Live',
    desc: 'Your service is running with a free public URL. Auto-SSL included.',
    code: 'https://myproject.aerodeploy.app',
    icon: 'globe',
  },
] as const

export default function HowItWorks() {
  const sectionRef = useRevealOnReturn<HTMLDivElement>()

  return (
    <section className="hiw-section" id="how-it-works">
        <div className="hiw-header">
          <p className="section-label">How It Works</p>
          <h2 className="section-title">
            From zero to deployed<br />
            <em>in three steps</em>
          </h2>
        </div>

        <div className="hiw-grid reveal" ref={sectionRef}>
          {STEPS.map((step) => (
            <div key={step.number} className="hiw-card">
              <div className="hiw-number">{step.number}</div>
              <HiwIcon name={step.icon} />
              <h3 className="hiw-title">{step.title}</h3>
              <p className="hiw-desc">{step.desc}</p>
              <div className="hiw-code">
                <code>{step.code}</code>
              </div>
            </div>
          ))}
        </div>
    </section>
  )
}

/* ── Step Icons ── */
function HiwIcon({ name }: { name: string }) {
  const props = {
    className: 'hiw-icon',
    width: 32,
    height: 32,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'download':
      return (
        <svg {...props}>
          <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" />
          <polyline points="7,10 12,15 17,10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      )
    case 'rocket':
      return (
        <svg {...props}>
          <path d="M4.5 16.5C3 18 2 21 2 21C2 21 5 20 6.5 18.5C7.32 17.68 7.32 16.32 6.5 15.5C5.68 14.68 4.32 14.68 3.5 15.5" />
          <path d="M14.5 4C14.5 4 18 2 22 2C22 6 20 9.5 20 9.5" />
          <path d="M8.5 9.5L14.5 15.5" />
          <path d="M15 2C15 2 22 9 22 9" />
          <path d="M11 6L6 11L8.5 13.5L18 4" />
          <path d="M13 18L18 13L15.5 10.5L6 20" />
        </svg>
      )
    case 'globe':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12H22" />
          <path d="M12 2C14.5 4.73 16 8.2 16 12C16 15.8 14.5 19.27 12 22C9.5 19.27 8 15.8 8 12C8 8.2 9.5 4.73 12 2Z" />
        </svg>
      )
    default:
      return null
  }
}
