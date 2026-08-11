import Link from 'next/link'
import AeroLogo from './AeroLogo'

export default function FooterCTA() {
  return (
    <footer>
      {/* Footer Call-to-Action */}
      <section className="footer-cta" id="footer-cta">
        <h2 className="footer-cta-title">
          Ready to own<br />
          <em>your cloud?</em>
        </h2>
        <p className="footer-cta-sub">
          Deploy on your hardware in minutes. No credit card required, no vendor lock-in, no cloud bills.
        </p>
        <a href="https://dashboard.aerodeploy.app" className="btn-primary" id="footer-get-started">
          Get Started
        </a>
      </section>

      {/* Premium Multi-Column Links Section */}
      <div className="footer-grid-container">
        <div className="footer-grid-inner">
          <div className="footer-grid">
            {/* Brand Info */}
            <div className="footer-brand-col">
              <Link href="/" className="footer-logo">
                <AeroLogo className="footer-logo-icon" size={20} monochrome />
                <span>AERO</span>
              </Link>
              <p className="footer-desc">
                High-performance self-hosted PaaS. Turn any machine into your private, secure cloud.
              </p>
              <div className="footer-socials">
                <a
                  href="https://github.com/Miskovy"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Aero GitHub"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                </a>
                <a
                  href="https://discord.gg/g89G9ENMrR"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Aero Discord"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8Z" />
                    <circle cx="7" cy="12" r="1" />
                    <circle cx="13" cy="12" r="1" />
                    <path d="M10 15c-1.5 0-2.5-.5-2.5-.5m5 0s-1-.5-2.5-.5" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#custom-domains">Custom Domains</a></li>
                <li><a href="#why-aero">Why Aero</a></li>
                <li><a href="#pricing">Pricing Plans</a></li>
              </ul>
            </div>

            {/* Resources Links */}
            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                <li><a href="https://docs.aerodeploy.app">Documentation</a></li>
                <li><a href="https://discord.gg/g89G9ENMrR" target="_blank" rel="noopener noreferrer">Community</a></li>
                <li><a href="https://github.com/Miskovy" target="_blank" rel="noopener noreferrer">GitHub Profile</a></li>
                {/* <li><a href="/status">System Status</a></li> */}
              </ul>
            </div>

            {/* Legal Links */}
            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          {/* Footer Bottom Bar */}
          <div className="footer-bottom">
            <span className="footer-copyright">
              &copy; {new Date().getFullYear()} Aero PaaS. All rights reserved. Proprietary Freemium License.
            </span>
            {/* <div className="footer-status-indicator">
              <span className="status-dot green-glow"></span>
              <a href="/status">All systems operational</a>
            </div> */}
          </div>
        </div>
      </div>
    </footer>
  )
}

