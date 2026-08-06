'use client'

import { useRevealOnReturn } from '../hooks/useRevealOnReturn'

const TIERS = [
  {
    name: 'FREE',
    price: '$0',
    period: 'forever',
    desc: 'Perfect for solo developers and side projects.',
    highlight: false,
    features: [
      '1 project & 3 services',
      '1 node connection',
      '50 deployments / mo',
      '2 automated backups',
      'Community support',
    ],
  },
  {
    name: 'PRO',
    price: '$29',
    period: '/month',
    desc: 'For growing applications and indie hackers.',
    highlight: false,
  },
  {
    name: 'MAX',
    price: '$99',
    period: '/month',
    desc: 'For enterprise clusters and unlimited workloads.',
    highlight: true,
    badge: 'Unlimited',
  },
] as const

export default function PricingPreview() {
  const sectionRef = useRevealOnReturn<HTMLDivElement>()

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-header">
        <p className="section-label">Pricing</p>
        <h2 className="section-title">
          Free for individuals.<br />
          <em>Scale when you&apos;re ready.</em>
        </h2>
        <p className="pricing-subtitle">
          Start deploying on your hardware at zero cost. Upgrade only when your team grows.
        </p>
        <div style={{ marginTop: '1.5rem' }}>
          <a href="/pricing" className="btn-primary" id="cta-pricing-page" style={{ padding: '0.7rem 1.8rem', fontSize: '0.85rem', textDecoration: 'none' }}>
            View Full Pricing Page &rarr;
          </a>
        </div>
      </div>

      <div className="pricing-grid reveal" ref={sectionRef} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`pricing-card ${tier.highlight ? 'pricing-card-highlight' : ''}`}
          >
            {tier.highlight && tier.badge && (
              <span className="pricing-badge">{tier.badge}</span>
            )}
            <h3 className="pricing-name">{tier.name}</h3>
            <div className="pricing-price">
              <span className="pricing-amount">{tier.price}</span>
              <span className="pricing-period">{tier.period}</span>
            </div>
            <p className="pricing-desc" style={{ fontWeight: 150 }}>{tier.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
