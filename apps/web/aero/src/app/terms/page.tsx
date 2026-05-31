'use client'

import React from 'react'
import AeroLogo from '../components/AeroLogo'

export default function TermsOfService() {
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
          <h1 className="legal-title">Terms of Service</h1>
          <p className="legal-meta">Last updated: June 1, 2026</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Introduction & Core Mission</h2>
            <p>
              Welcome to Aero. Aero is a self-hosted developer platform designed to turn any workstation, PC, or private server into an on-premise cloud PaaS. By downloading, compiling, or using the Aero self-hosted software or visiting our website, you agree to comply with and be bound by these Terms of Service.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Proprietary Freemium Licensing</h2>
            <p>
              Aero is proprietary, closed-source software operated on a freemium model. Please review our licensing terms carefully:
            </p>
            <ul>
              <li>
                <strong>Free Developer Tier License:</strong> Aero grants you a limited, non-exclusive, non-transferable, personal license to download, install, and run the self-hosted Aero engine for personal, educational, or evaluation purposes. The Free Developer Tier is strictly capped at <strong>one (1) active server node</strong> and <strong>three (3) deployed applications</strong>. Custom domain mapping is disabled on this tier (default <code>*.aerodeploy.app</code> subdomains only).
              </li>
              <li>
                <strong>Commercial Pro & Enterprise Tier:</strong> Deploying Aero for commercial workloads, removing server or application limits, enabling <strong>custom domains</strong>, or unlocking enterprise features (such as team spaces, SAML SSO, automated volume backups, and multi-node clustering) requires a paid subscription. You must purchase and activate a valid <strong>Aero Pro</strong> or <strong>Aero Enterprise</strong> license key.
              </li>
              <li>
                <strong>Prohibited Activities & IP Protection:</strong> The Aero source code and compiled binaries are closed-source intellectual property. You are strictly prohibited from decompiling, reverse engineering, disassembling, copying, modifying, distributing, reselling, or sub-licensing any portion of the Aero software, CLI tool, or edge network proxies.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Fair Use of `*.aerodeploy.app` Subdomains</h2>
            <p>
              To simplify local development, Aero provides free, automated public URLs using Cloudflare tunnels or custom secure tunnels mapped to our managed wildcard DNS domains (e.g., <code>[your-app].aerodeploy.app</code>).
            </p>
            <p>
              By using these subdomains, you agree to:
            </p>
            <ul>
              <li>Not host malicious software, spyware, trojans, ransomware, or keyloggers.</li>
              <li>Not deploy phishing landing pages, deceitful financial scams, or coordinate cyber attacks.</li>
              <li>Not distribute illegal downloads, hate speech, or content violating copyright/Intellectual Property rights.</li>
              <li>Not run scraping operations or automated load-testing programs that degrade our DNS infrastructure.</li>
            </ul>
            <p>
              We reserve the absolute right to suspend, terminate, or ban any subdomain immediately if it is reported for violation of these rules, without prior notification.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Hardware Sovereignty & Support</h2>
            <p>
              Because Aero is a self-hosted engine running on your own physical hardware, virtualization nodes, or dedicated cloud VPS:
            </p>
            <ul>
              <li><strong>Hardware Health:</strong> You are fully responsible for the compute performance, temperature control, storage hardware, internet bandwidth, and operating system updates of the machines hosting Aero.</li>
              <li><strong>Backups:</strong> You bear the sole responsibility of setting up scheduled backups for your database schemas and volume directories. Aero does not hold, store, or recover your backups.</li>
              <li><strong>Control:</strong> You have full sovereignty and control over your container network isolation and firewall ports. We are not liable for external intrusions resulting from open host configurations.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Warranty Disclaimers</h2>
            <p>
              THE AERO PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL AERO TECHNOLOGIES OR ITS CONTRIBUTORS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of our operating jurisdiction, without regard to conflict of law principles. Any legal actions must be filed in the courts of our registered headquarters.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Updates to these Terms</h2>
            <p>
              We modify these terms periodically to reflect updates in our licensing models, subdomain offerings, or legal regulations. Continued use of the software represents acceptance of the revised conditions.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
