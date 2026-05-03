export default function FooterCTA() {
  return (
    <footer>
      <section className="footer-cta" id="footer-cta">
        <h2 className="footer-cta-title">
          Ready to own<br />
          <em>your cloud?</em>
        </h2>
        <p className="footer-cta-sub">
          Deploy on your hardware in minutes. No credit card required, no vendor lock-in, no cloud bills.
        </p>
        <a href="/login" className="btn-primary" id="footer-get-started">
          Get Started
        </a>
      </section>

      <div className="footer-bar">
        <span className="footer-brand">
          &copy; {new Date().getFullYear()} Aero. Self-hosted PaaS for everyone.
        </span>
        <ul className="footer-links">
          <li><a href="https://docs.aerodeploy.app">Documentation</a></li>
          <li><a href="https://discord.gg/aero" target="_blank" rel="noopener noreferrer">Discord</a></li>
          <li><a href="/blog">Blog</a></li>
          <li><a href="/status">Status</a></li>
          <li><a href="/privacy">Privacy</a></li>
        </ul>
      </div>
    </footer>
  )
}
