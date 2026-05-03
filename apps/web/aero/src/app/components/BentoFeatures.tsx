'use client'

import { useRevealOnReturn } from '../hooks/useRevealOnReturn'

const FEATURES = [
  {
    icon: 'deploy',
    title: 'One-Click Deploy',
    desc: 'Push your code or Docker image and Aero handles the rest. From git push to production in seconds.',
  },
  {
    icon: 'docker',
    title: 'Docker Native',
    desc: 'Built on Docker from the ground up. Compose files, custom Dockerfiles, or pre-built images.',
  },
  {
    icon: 'url',
    title: 'Public URLs',
    desc: 'Automatic SSL certificates and domain routing via Traefik. Expose services to the internet instantly.',
  },
  {
    icon: 'logs',
    title: 'Real-Time Logs',
    desc: 'Stream stdout and stderr in real time. Search, filter, and export logs from every container.',
  },
  {
    icon: 'vault',
    title: 'Secrets Vault',
    desc: 'AES-256-GCM encrypted secrets injected at runtime. Your sensitive data never leaves your machine.',
  },
  {
    icon: 'monitor',
    title: 'Resource Monitoring',
    desc: 'Track CPU, memory, disk, and network for every service. Set alerts before issues become outages.',
  },
  {
    icon: 'domain',
    title: 'Custom Domains',
    desc: 'Free subdomain on aerodeploy.app included. Upgrade to connect your own domain with auto-SSL.',
  },
  {
    icon: 'marketplace',
    title: 'App Marketplace',
    desc: 'One-click deploy WordPress, PostgreSQL, Redis, and more. Deploy production-ready stacks instantly.',
  },
] as const

export default function BentoFeatures() {
  const gridRef = useRevealOnReturn<HTMLDivElement>()

  return (
    <section className="features-section" id="features">
        <div className="features-header">
          <p className="features-label">Features</p>
          <h2 className="features-title">
            Everything you need to<br />
            <em>own your infrastructure</em>
          </h2>
        </div>

        <div className="bento-grid reveal" ref={gridRef}>
          {FEATURES.map((f) => (
            <div key={f.icon} className="bento-card">
              <FeatureIcon name={f.icon} />
              <h3 className="bento-title">{f.title}</h3>
              <p className="bento-desc">{f.desc}</p>
            </div>
          ))}
        </div>
    </section>
  )
}

/* ── Monochrome SVG Icons ── */
function FeatureIcon({ name }: { name: string }) {
  const props = {
    className: 'bento-icon',
    width: 36,
    height: 36,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'deploy':
      return (
        <svg {...props}>
          <path d="M12 2L22 8.5V15.5L12 22L2 15.5V8.5L12 2Z" />
          <path d="M12 22V15.5" />
          <path d="M22 8.5L12 15.5L2 8.5" />
        </svg>
      )
    case 'docker':
      return (
        <svg {...props}>
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="M7 8V6C7 4.9 7.9 4 9 4H15C16.1 4 17 4.9 17 6V8" />
          <line x1="10" y1="12" x2="10" y2="16" />
          <line x1="14" y1="12" x2="14" y2="16" />
        </svg>
      )
    case 'url':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12H22" />
          <path d="M12 2C14.5 4.73 16 8.2 16 12C16 15.8 14.5 19.27 12 22C9.5 19.27 8 15.8 8 12C8 8.2 9.5 4.73 12 2Z" />
        </svg>
      )
    case 'logs':
      return (
        <svg {...props}>
          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      )
    case 'vault':
      return (
        <svg {...props}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7C7 4.24 9.24 2 12 2C14.76 2 17 4.24 17 7V11" />
          <circle cx="12" cy="16.5" r="1.5" />
        </svg>
      )
    case 'monitor':
      return (
        <svg {...props}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <polyline points="6,10 9,7 12,11 16,6 18,9" />
        </svg>
      )
    case 'domain':
      return (
        <svg {...props}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )
    case 'marketplace':
      return (
        <svg {...props}>
          <rect x="2" y="7" width="20" height="15" rx="2" />
          <path d="M17 2L12 7L7 2" />
          <line x1="12" y1="22" x2="12" y2="13" />
          <line x1="2" y1="13" x2="22" y2="13" />
        </svg>
      )
    default:
      return null
  }
}
