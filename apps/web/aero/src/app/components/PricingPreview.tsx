'use client'

import { useRevealOnReturn } from '../hooks/useRevealOnReturn'

/* ══════════════════════════════════════════════════════════
   FULL PRICING DATA — Uncomment when ready to show real tiers
   ══════════════════════════════════════════════════════════

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Perfect for solo devs and side projects.',
    highlight: false,
    features: [
      '3 projects',
      '5 services per project',
      '1 custom domain',
      'Free *.aerodeploy.app subdomain',
      'Real-time logs (24h)',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/month',
    desc: 'For freelancers and indie hackers.',
    highlight: false,
    features: [
      'Unlimited projects',
      '20 services per project',
      '10 custom domains',
      'Wildcard SSL',
      'Real-time logs (7 day)',
      'Email support (48h SLA)',
      'Automated daily backups',
    ],
  },
  {
    name: 'Team',
    price: '$39',
    period: '/month',
    desc: 'For startups and growing teams.',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Everything in Pro',
      'Unlimited services',
      'Unlimited custom domains',
      'Up to 10 team members',
      'RBAC (4 built-in roles)',
      'Audit logging (30 day)',
      'Real-time logs (30 day)',
      'Email support (24h SLA)',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For companies and regulated industries.',
    highlight: false,
    features: [
      'Everything in Team',
      'Unlimited team members',
      'Custom RBAC roles',
      'SSO (SAML/OIDC)',
      'Audit logging (7 year)',
      'Multi-node clusters',
      'Vault integration',
      'Dedicated support engineer',
      'SLA guarantee (99.9%)',
    ],
  },
] as const

   ══════════════════════════════════════════════════════════ */

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
        </div>

        <div className="pricing-coming-soon reveal" ref={sectionRef}>
          <div className="pricing-cs-card">
            <div className="pricing-cs-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
            </div>
            <h3 className="pricing-cs-title">Pricing Coming Soon</h3>
            <p className="pricing-cs-desc">
              Aero is free during the public beta. We&apos;ll announce pricing tiers before the official launch — 
              the free tier will <strong>always</strong> remain free for individual developers.
            </p>
            <div className="pricing-cs-badges">
              <span className="pricing-cs-badge">Free forever for solo devs</span>
              <span className="pricing-cs-badge">No credit card required</span>
              <span className="pricing-cs-badge">Free *.aerodeploy.app subdomain</span>
            </div>
          </div>
        </div>

        {/* ── Full Pricing Grid (uncomment when ready) ──
        <div className="pricing-grid reveal" ref={sectionRef}>
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
              <p className="pricing-desc">{tier.desc}</p>
              <a
                href={tier.name === 'Enterprise' ? '#contact' : '/login'}
                className={tier.highlight ? 'btn-primary' : 'btn-secondary'}
              >
                {tier.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
              </a>
              <ul className="pricing-features">
                {tier.features.map((f) => (
                  <li key={f}>
                    <span className="pricing-check">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        ── End Full Pricing Grid ── */}
    </section>
  )
}
