'use client'

import Link from 'next/link'
import AeroLogo from '../components/AeroLogo'

const PRICING_PLANS = [
  {
    name: 'FREE',
    price: '$0',
    period: 'forever',
    description: 'Ideal for personal workloads, solo developers, and experimental projects.',
    highlight: false,
    badge: null,
    features: [
      '1 Active Project',
      '3 Application Services',
      '1 Connected Node Machine',
      '50 Build Deployments / mo',
      '2 Automated Backups',
      '2 Webhook Trigger Endpoints',
      '2 API Management Keys',
      '5 Real-time System Alerts',
      'Community & Discord Support',
    ],
  },
  {
    name: 'PRO',
    price: '$29',
    period: '/month',
    description: 'Designed for production workloads, indie hackers, and professional teams.',
    highlight: false,
    badge: 'Popular',
    features: [
      '10 Active Projects',
      '25 Application Services',
      '5 Connected Node Machines',
      '500 Build Deployments / mo',
      '20 Automated Backups',
      '10 Webhook Trigger Endpoints',
      '10 API Management Keys',
      '25 Real-time System Alerts',
      'Custom Domain Names & Auto-SSL',
      '5 Team Workspaces',
      'Priority SLA Support',
    ],
  },
  {
    name: 'MAX',
    price: '$99',
    period: '/month',
    description: 'Unlimited capacity for enterprise clusters, scaleups, and heavy workloads.',
    highlight: true,
    badge: 'Unlimited Everything',
    features: [
      'Unlimited Projects & Services',
      'Unlimited Node Machines',
      'Unlimited Build Deployments',
      'Unlimited Backups & Webhooks',
      'Unlimited API Keys & Alerts',
      'Unlimited Team Workspaces & Members',
      'Custom Domains & Wildcard SSL',
      'Isolated Hardware Clusters',
      'Dedicated 24/7 Priority Support',
    ],
  },
]

export default function PricingPage() {
  return (
    <div className="bg-background min-h-screen text-foreground font-sans">
      {/* Navigation Header */}
      <header className="nav">
        <Link href="/" className="nav-logo">
          <AeroLogo size={20} />
          <span>AERO</span>
        </Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/" className="nav-link">
            Home
          </Link>
          <a href="https://dashboard.aerodeploy.app" className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', textDecoration: 'none' }}>
            Go to Dashboard &rarr;
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="legal-container" style={{ maxWidth: '1140px', padding: '6rem 2rem' }}>
        <div className="legal-header" style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <Link href="/" className="legal-back" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to home
          </Link>
          <h1 className="legal-title" style={{ fontSize: '2.8rem', fontFamily: 'var(--font-serif)' }}>
            Unlock your potential with Aero
          </h1>
          <p className="pricing-subtitle" style={{ marginTop: '0.75rem' }}>
            Deploy on your hardware with complete predictability.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="pricing-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', background: 'transparent', border: 'none' }}>
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`pricing-card ${plan.highlight ? 'pricing-card-highlight' : ''}`}
              style={{
                borderRadius: '16px',
                border: plan.highlight ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: plan.highlight ? 'var(--bg-raised)' : 'var(--bg-surface)',
                boxShadow: plan.highlight ? '0 10px 30px rgba(56, 189, 248, 0.1)' : 'none',
              }}
            >
              {plan.badge && (
                <span className="pricing-badge">{plan.badge}</span>
              )}
              <h3 className="pricing-name">{plan.name}</h3>
              <div className="pricing-price" style={{ margin: '0.5rem 0' }}>
                <span className="pricing-amount">{plan.price}</span>
                <span className="pricing-period">{plan.period}</span>
              </div>
              <p className="pricing-desc" style={{ minHeight: '44px' }}>{plan.description}</p>

              <a
                href="https://dashboard.aerodeploy.app"
                className={plan.highlight ? 'btn-primary' : 'btn-secondary'}
                style={{ textDecoration: 'none', textAlign: 'center', margin: '1rem 0 1.5rem' }}
              >
                Get Started with {plan.name}
              </a>

              <ul className="pricing-features" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                {plan.features.map((feature) => (
                  <li key={feature} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.85rem', marginBottom: '0.6rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
