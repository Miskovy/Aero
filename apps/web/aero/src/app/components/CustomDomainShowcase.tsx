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
              <li>Automatic Let&apos;s Encrypt SSL</li>
              <li>One-click DNS verification</li>
              <li>Wildcard certificates (Team+)</li>
              <li>Zero-downtime domain switching</li>
            </ul>
          </div>

          {/* Right — Visual */}
          <div className="domain-visual">
            <div className="domain-card-stack">
              {/* Free tier */}
              <div className="domain-example domain-example-free">
                <header className="domain-example-label">
                  <h4 className="domain-tier-heading">Free Tier · Instant Subdomain</h4>
                </header>
                <code className="domain-url">
                  <dfn className="domain-protocol">https://</dfn>
                  <b className="domain-name-user">myproject</b>
                  <em className="domain-name-base">.aerodeploy.app</em>
                </code>
                <footer className="domain-status">
                  <small>SSL Active · Auto-configured</small>
                </footer>
              </div>

              {/* Pro tier */}
              <div className="domain-example domain-example-pro">
                <header className="domain-example-label">
                  <h4 className="domain-tier-heading">Pro Tier · Custom Domain</h4>
                </header>
                <code className="domain-url">
                  <dfn className="domain-protocol">https://</dfn>
                  <b className="domain-name-user">api</b>
                  <em className="domain-name-base">.yourcompany.com</em>
                </code>
                <footer className="domain-status">
                  <small>SSL Active · DNS Verified</small>
                </footer>
              </div>
            </div>
          </div>
        </div>
    </section>
  )
}
