'use client'

import { useRevealOnReturn } from '../hooks/useRevealOnReturn'

const COMPARISONS = [
  {
    id: 'cloud',
    versus: 'vs Cloud PaaS',
    examples: '',
    headline: 'Zero cloud bills.',
    desc: 'Deploy on hardware you already own. No surprise charges, no bandwidth limits, no cold starts.',
    icon: 'cloud-off',
  },
  {
    id: 'selfhosted',
    versus: 'vs Other Self-Hosted',
    examples: '',
    headline: 'Desktop-native. Enterprise-ready.',
    desc: 'Native desktop app, offline support, and a full enterprise feature roadmap — SSO, audit logs, multi-node.',
    icon: 'shield',
  },
  {
    id: 'diy',
    versus: 'vs DIY Docker',
    examples: '',
    headline: 'One command. Not twenty config files.',
    desc: 'Skip the reverse proxy configs, SSL setup, and deployment scripts. Aero handles everything.',
    icon: 'terminal',
  },
] as const

export default function WhyAero() {
  const gridRef = useRevealOnReturn<HTMLDivElement>()

  return (
    <section className="why-section" id="why-aero">
        <div className="why-header">
          <p className="section-label">Why Aero</p>
          <h2 className="section-title">
            The best of both worlds.<br />
            <em>Cloud simplicity, self-hosted control.</em>
          </h2>
        </div>

        <div className="why-grid reveal" ref={gridRef}>
          {COMPARISONS.map((c) => (
            <div key={c.id} className="why-card">
              <WhyIcon name={c.icon} />
              <span className="why-versus">{c.versus}</span>
              <span className="why-examples">{c.examples}</span>
              <h3 className="why-headline">{c.headline}</h3>
              <p className="why-desc">{c.desc}</p>
            </div>
          ))}
        </div>
    </section>
  )
}

/* ── Comparison Icons ── */
function WhyIcon({ name }: { name: string }) {
  const props = {
    className: 'why-icon',
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
    case 'cloud-off':
      return (
        <svg {...props}>
          <path d="M22.61 16.95C22.85 16.35 23 15.69 23 15C23 12.36 21.05 10.22 18.55 10.04C17.89 6.62 14.96 4 11.5 4C10.23 4 9.04 4.34 8 4.92" />
          <path d="M5 5C2.79 6.14 1 8.86 1 12C1 15.31 3.69 18 7 18H18" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 22S20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" />
          <polyline points="9,12 11,14 15,10" />
        </svg>
      )
    case 'terminal':
      return (
        <svg {...props}>
          <polyline points="4,17 10,11 4,5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      )
    default:
      return null
  }
}
