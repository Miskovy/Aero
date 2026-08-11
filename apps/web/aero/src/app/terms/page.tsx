'use client'

import Link from 'next/link'
import AeroLogo from '../components/AeroLogo'

export default function TermsOfService() {
  return (
    <div className="bg-background min-h-screen text-foreground font-sans">
      {/* Navigation Header */}
      <header className="nav">
        <Link href="/" className="nav-logo">
          <AeroLogo size={20} />
          <span>AERO</span>
        </Link>
        <Link href="/" className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', textDecoration: 'none' }}>
          Back to Home
        </Link>
      </header>

      {/* Main Content */}
      <main className="legal-container">
        <div className="legal-header">
          <Link href="/" className="legal-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to home
          </Link>
          <h1 className="legal-title">Terms of Service</h1>
          <p className="legal-meta">Last updated: August 6, 2026</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Introduction &amp; Core Mission</h2>
            <p>
              Welcome to Aero. Aero is a self-hosted developer platform designed to turn any workstation, PC, or private server into an on-premise cloud PaaS. By downloading, compiling, purchasing a license, or using the Aero self-hosted engine or visiting our website, you agree to comply with and be bound by these Terms of Service.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Proprietary Freemium Licensing</h2>
            <p>
              Aero is proprietary commercial software operated on a freemium model. Please review our licensing terms carefully:
            </p>
            <ul>
              <li>
                <strong>Free Developer Tier License:</strong> Aero grants you a limited, non-exclusive, non-transferable, personal license to download, install, and run the self-hosted Aero engine for personal, educational, or evaluation purposes. The Free Developer Tier includes basic resource limits (e.g. 1 active node and 3 deployed applications).
              </li>
              <li>
                <strong>Commercial Pro &amp; Max Tier:</strong> Deploying Aero for commercial workloads, unlocking higher or unlimited resource limits, enabling custom domains, or accessing advanced features (such as team workspaces, automated backups, and multi-node clustering) requires an active paid subscription (e.g., Aero Pro or Aero Max).
              </li>
              <li>
                <strong>Prohibited Activities &amp; IP Protection:</strong> The Aero source code and compiled binaries are intellectual property. You are strictly prohibited from decompiling, reverse engineering, disassembling, copying, modifying, distributing, reselling, or sub-licensing any portion of the Aero software, CLI tool, or edge network proxies without express authorization.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Subscriptions, Payments &amp; Paymob Integration</h2>
            <p>
              All paid subscriptions, license upgrades, and recurring billing transactions on Aero are securely processed by our third-party payment gateway partner, <strong>Paymob</strong>.
            </p>
            <ul>
              <li>
                <strong>Payment Processing &amp; Methods:</strong> Payments are processed via Paymob. Depending on your region, supported payment methods may include credit cards, debit cards, prepaid cards, and supported electronic wallets.
              </li>
              <li>
                <strong>Order &amp; License Confirmation:</strong> Paid subscription orders and feature license activations are confirmed and granted only after successful payment authorization by Paymob.
              </li>
              <li>
                <strong>Payment Credentials Security:</strong> Sensitive payment details (including full card numbers, CVVs/CVCs, and expiration dates) are submitted directly to Paymob&apos;s encrypted processing interface. Aero never receives, stores, or processes your full payment card details on our servers.
              </li>
              <li>
                <strong>Payment Disputes &amp; Chargebacks:</strong> Any billing inquiries, payment disputes, or chargeback claims are handled in accordance with Paymob&apos;s procedures and applicable payment network operating rules.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Refund Policy</h2>
            <p>
              Refund requests are evaluated under our standard customer refund guidelines:
            </p>
            <ul>
              <li>
                <strong>Original Payment Method:</strong> Approved refunds will be processed and returned exclusively to the original payment method used during the initial transaction via Paymob.
              </li>
              <li>
                <strong>Processing Timeline:</strong> Refund availability and processing times depend on your financial institution and Paymob&apos;s standard settlement cycles.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Fair Use of `*.aerodeploy.app` Subdomains</h2>
            <p>
              To simplify local development, Aero provides free, automated public URLs using Cloudflare tunnels or secure edge proxies mapped to our managed wildcard DNS domains (e.g., <code>[your-app].aerodeploy.app</code>).
            </p>
            <p>
              By using these subdomains, you agree to:
            </p>
            <ul>
              <li>Not host malicious software, spyware, trojans, ransomware, or keyloggers.</li>
              <li>Not deploy phishing landing pages, deceitful financial scams, or coordinate cyber attacks.</li>
              <li>Not distribute illegal downloads or content violating intellectual property rights.</li>
              <li>Not run scraping operations or automated load-testing programs that degrade our DNS infrastructure.</li>
            </ul>
            <p>
              We reserve the right to suspend or revoke any subdomain immediately if it violates these conditions, without prior notice.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Hardware Sovereignty &amp; System Maintenance</h2>
            <p>
              Because Aero is a self-hosted engine running on your physical workstations, local servers, or private VPS instances:
            </p>
            <ul>
              <li><strong>Hardware Health:</strong> You are fully responsible for the compute performance, temperature control, storage media, network connectivity, and operating system security of your host machines.</li>
              <li><strong>Backups:</strong> You bear primary responsibility for establishing data backup strategies for your local databases and container volumes.</li>
              <li><strong>Security &amp; Network Controls:</strong> You maintain sovereignty over host firewall rules, container ports, and local access rights.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>7. Warranty Disclaimers</h2>
            <p>
              THE AERO PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL AERO OR ITS CONTRIBUTORS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM THE USE OF THE SOFTWARE.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any dispute arising under these terms shall be subject to the jurisdiction of competent courts.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Updates to these Terms</h2>
            <p>
              We reserve the right to update these Terms of Service periodically to reflect platform enhancements, payment processor updates, or regulatory changes. Continued use of Aero following posted updates constitutes acceptance of the modified terms.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
