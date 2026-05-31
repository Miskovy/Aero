'use client'

import React from 'react'
import AeroLogo from '../components/AeroLogo'

export default function PrivacyPolicy() {
  return (
    <div className="bg-background min-h-screen text-foreground font-sans">
      {/* Navigation Header */}
      <header className="nav">
        <a href="/" className="nav-logo">
          <AeroLogo size={20} />
          <span>AERO</span>
        </a>
        <a href="/" className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
          Back to Home
        </a>
      </header>

      {/* Main Content */}
      <main className="legal-container">
        <div className="legal-header">
          <a href="/" className="legal-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to home
          </a>
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-meta">Last updated: June 1, 2026</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Our Commitment to Your Privacy</h2>
            <p>
              Aero Technologies (&ldquo;Aero&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) builds proprietary, self-hosted deployment infrastructure. Our product philosophy is centered on <strong>data sovereignty</strong> and <strong>privacy by default</strong>.
            </p>
            <p>
              Unlike traditional cloud PaaS platforms that ingest, build, and store your applications on their servers, Aero is designed to run entirely on your own local hardware (personal PCs, developer workstations, local virtualization hosts, or on-premise servers). You own your hardware, and you own your data.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. No Application Data Harvesting</h2>
            <p>
              Aero does not collect, access, store, or monitor:
            </p>
            <ul>
              <li>Your application source code or build outputs.</li>
              <li>Your database connection credentials, passwords, or schema designs.</li>
              <li>Your environment variables or secrets.</li>
              <li>Your deployment logs, traffic metadata, or visitor statistics.</li>
            </ul>
            <p>
              All build processes (triggered via git webhooks or the CLI) and application workloads run inside isolated Docker containers on your local host machines. All configuration states are stored in your local SQLite/PostgreSQL database instances, managed exclusively by you.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Local Secrets Encryption (AES-256-GCM)</h2>
            <p>
              Any environment variables or API keys managed by the Aero Control Plane API are stored locally. These sensitive configurations are encrypted at rest on your host machine using the <strong>AES-256-GCM</strong> encryption standard with a master cryptography key generated locally on setup. This master key never leaves your system.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. License Key Verification</h2>
            <p>
              Aero is proprietary commercial software. Utilizing the Aero self-hosted engine requires a valid, active subscription license key.
            </p>
            <p>
              When you activate an Aero Pro subscription:
            </p>
            <ul>
              <li>The self-hosted instance pings our central billing and key verification server (<code>https://api.aerodeploy.app/v1/licenses/verify</code>).</li>
              <li>This ping only transmits the cryptographically signed license key string to verify active Stripe status.</li>
              <li>No infrastructure telemetry, deployment details, node metadata, or user names are ever sent to our servers during verification.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Opt-in Diagnostic Telemetry</h2>
            <p>
              The Aero self-hosted software may collect minimal, completely anonymous diagnostic telemetry to help us improve system performance and identify core platform bugs.
            </p>
            <p>
              <strong>Important Guidelines:</strong>
            </p>
            <ul>
              <li><strong>Completely Optional:</strong> You can completely disable telemetry on setup or anytime within the CLI settings using the command <code>aero telemetry disable</code>.</li>
              <li><strong>Zero PII:</strong> If active, telemetry only shares platform crash logs and hardware capability statistics (e.g., CPU model, RAM amount, Docker daemon version).</li>
              <li><strong>No Secrets:</strong> Our collection engine filters out all environment values, domain names, application names, and user passwords before reporting.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Changes to this Policy</h2>
            <p>
              We reserve the right to update this Privacy Policy as our platform evolves. Any changes will be published here with an updated revision date.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Contact Information</h2>
            <p>
              For privacy-related questions, data access requests, or self-hosted compliance queries, please reach out to us at <strong>miskovyg@gmail.com</strong>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
