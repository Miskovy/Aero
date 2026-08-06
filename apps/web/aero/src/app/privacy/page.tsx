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
        <a href="/" className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', textDecoration: 'none' }}>
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
          <p className="legal-meta">Last updated: August 6, 2026</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <h2>1. Privacy Principles &amp; Architecture</h2>
            <p>
              Aero Technologies (&ldquo;Aero&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) designs self-hosted developer infrastructure focused on <strong>data sovereignty</strong> and <strong>privacy by default</strong>.
            </p>
            <p>
              Because Aero operates as a self-hosted engine running on your own host machines (workstations, local servers, or private cloud VPS), your core application code, database data, environment secrets, and deployment logs remain on your machines under your control.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Information We Collect</h2>
            <p>
              We collect minimal information necessary to operate our platform, process subscriptions, and authenticate user accounts:
            </p>
            <ul>
              <li>
                <strong>Account Information:</strong> Name, email address, and encrypted password credentials when you register an account.
              </li>
              <li>
                <strong>License &amp; Usage Metadata:</strong> Subscription status, tier level (e.g. Free, Pro, Max), and license activation verification tokens.
              </li>
              <li>
                <strong>Technical Logs:</strong> Minimal authentication logs (IP address, login timestamps, and browser user agent) for account security and session protection.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Payment Processing &amp; Paymob Integration</h2>
            <p>
              Subscription payments and recurring billing are processed securely through our third-party payment gateway provider, <strong>Paymob</strong>.
            </p>
            <ul>
              <li>
                <strong>Payment Processing by Paymob:</strong> Payment transactions are executed directly by Paymob. When you purchase or manage a subscription, your payment details are collected through Paymob&apos;s secure interfaces.
              </li>
              <li>
                <strong>No Card Credentials Stored by Aero:</strong> Aero does not collect, receive, or store full payment card numbers, CVC/CVV security codes, or card expiration dates on our servers.
              </li>
              <li>
                <strong>Processed Payment Metadata:</strong> Aero receives and retains only non-sensitive transaction records provided by Paymob, such as transaction IDs, payment status, subscription tier, billing amount, and payment method indicators (e.g. card brand, last 4 digits, or wallet provider) for invoice history and account management.
              </li>
              <li>
                <strong>Information Shared with Paymob:</strong> Necessary data (such as customer name, email address, transaction amount, and order reference) is transmitted to Paymob solely for the purpose of completing payment authorization, fraud detection, legal compliance, and transaction verification.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Cookies, Session &amp; Local Storage</h2>
            <p>
              We use essential browser cookies and local storage mechanisms to support core application functionality:
            </p>
            <ul>
              <li>
                <strong>Session Tokens:</strong> Secure HTTP-only cookies or authentication tokens used to maintain your logged-in state across dashboard sessions.
              </li>
              <li>
                <strong>Local Storage Preferences:</strong> Browser local storage keys (such as active workspace IDs, local preferences, or UI state) saved directly on your browser for seamless navigation.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Opt-in Diagnostic Telemetry</h2>
            <p>
              The Aero self-hosted software may collect minimal, optional diagnostic telemetry to assist in identifying system bugs and hardware compatibility issues.
            </p>
            <ul>
              <li><strong>Optional:</strong> You can disable telemetry during setup or anytime via CLI using <code>aero telemetry disable</code>.</li>
              <li><strong>Zero PII / No Application Data:</strong> Diagnostic reports filter out environment values, secret keys, user passwords, domain names, and database payloads.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. User Rights &amp; Data Control</h2>
            <p>
              Depending on your jurisdiction, you have specific rights regarding your personal information:
            </p>
            <ul>
              <li><strong>Access &amp; Rectification:</strong> Right to review and update your account details through your dashboard profile settings.</li>
              <li><strong>Account Deletion:</strong> Right to request the permanent deletion of your Aero user account and associated transaction history.</li>
              <li><strong>Telemetry Control:</strong> Right to toggle diagnostic telemetry settings on your self-hosted instances at any time.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>7. Policy Updates &amp; Contact</h2>
            <p>
              We may update this Privacy Policy to reflect platform improvements or payment processing updates. Any revisions will be published on this page with an updated revision date.
            </p>
            <p>
              For privacy inquiries, data deletion requests, or compliance questions, please contact us at <strong>miskovyg@gmail.com</strong>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
