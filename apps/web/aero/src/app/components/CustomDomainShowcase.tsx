'use client'

import { useRevealOnReturn } from '../hooks/useRevealOnReturn'

export default function CustomDomainShowcase() {
  const sectionRef = useRevealOnReturn<HTMLDivElement>()

  return (
    <section className="domain-section" id="custom-domains">
        <div className="domain-layout reveal" ref={sectionRef}>
          {/* Left — Copy */}
          <div className="domain-copy">
            <p className="section-label">Custom Domains</p>
            <h2 className="section-title">
              Free subdomain included.<br />
              <em>Bring your own domain.</em>
            </h2>
            <p className="domain-desc">
              Every deployment gets an instant public URL on <strong>aerodeploy.app</strong>. 
              When you&apos;re ready, connect your own domain with automatic SSL certificates 
              and DNS verification.
            </p>
            <ul className="domain-features">
              <li>
                <span className="domain-check">✓</span>
                Automatic Let&apos;s Encrypt SSL
              </li>
              <li>
                <span className="domain-check">✓</span>
                One-click DNS verification
              </li>
              <li>
                <span className="domain-check">✓</span>
                Wildcard certificates (Team+)
              </li>
              <li>
                <span className="domain-check">✓</span>
                Zero-downtime domain switching
              </li>
            </ul>
          </div>

          {/* Right — Visual */}
          <div className="domain-visual">
            <div className="domain-card-stack">
              {/* Free tier */}
              <div className="domain-example domain-example-free">
                <div className="domain-example-label">
                  <span className="domain-tier-badge domain-tier-free">Free</span>
                  <span className="domain-tier-text">Instant subdomain</span>
                </div>
                <div className="domain-url">
                  <span className="domain-protocol">https://</span>
                  <span className="domain-name-user">myproject</span>
                  <span className="domain-name-base">.aerodeploy.app</span>
                </div>
                <div className="domain-status">
                  <span className="domain-status-dot domain-status-active" />
                  <span>SSL Active · Auto-configured</span>
                </div>
              </div>

              {/* Pro tier */}
              <div className="domain-example domain-example-pro">
                <div className="domain-example-label">
                  <span className="domain-tier-badge domain-tier-pro">Pro</span>
                  <span className="domain-tier-text">Custom domain</span>
                </div>
                <div className="domain-url">
                  <span className="domain-protocol">https://</span>
                  <span className="domain-name-user">api</span>
                  <span className="domain-name-base">.yourcompany.com</span>
                </div>
                <div className="domain-status">
                  <span className="domain-status-dot domain-status-active" />
                  <span>SSL Active · DNS Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
    </section>
  )
}
