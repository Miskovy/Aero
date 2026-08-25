import Link from 'next/link'
import AeroLogo from './components/AeroLogo'
import VanGoghCanvas from './components/VanGoghCanvas'

export default function NotFound() {
  return (
    <main className="min-h-screen relative flex flex-col items-center justify-between overflow-hidden">
      {/* ── Background Van Gogh Celestial Sky ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <VanGoghCanvas
          showSwirls={true}
          showConstellations={true}
          showMountains={true}
          showContours={true}
          intensity={0.8}
          starCount={40}
        />
      </div>

      {/* ── Floating Island Header ── */}
      <nav className="nav" id="nav-404">
        <Link href="/" className="nav-logo" id="nav-logo-404">
          <AeroLogo className="nav-logo-icon" monochrome />
          <strong className="nav-logo-text">AERO</strong>
        </Link>
        <ul className="nav-links">
          <li><Link href="/" className="nav-link">Home</Link></li>
          <li><Link href="/pricing" className="nav-link">Pricing</Link></li>
          <li><Link href="/status" className="nav-link">Status</Link></li>
          <li><Link href="https://docs.aerodeploy.app" className="nav-link">Docs</Link></li>
          <li><a href="https://dashboard.aerodeploy.app" className="nav-cta">Dashboard</a></li>
        </ul>
      </nav>

      {/* ── 404 Content Viewport ── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-36 pb-20 max-w-[720px] mx-auto my-auto">
        <header className="mb-6">
          <p className="section-label">HTTP Status 404</p>
          <h1 className="hero-headline text-5xl md:text-7xl">
            Lost in the<br />
            <em>celestial void</em>
          </h1>
        </header>

        <p className="hero-sub mb-8">
          The container route or page you are navigating to does not exist in this mesh cluster. It may have been unmapped or decommissioned.
        </p>

        {/* Diagnostic Terminal Mockup */}
        <div className="w-full max-w-[500px] mb-10 text-left">
          <div className="terminal">
            <header className="terminal-header">
              <div className="terminal-dot" />
              <div className="terminal-dot" />
              <div className="terminal-dot" />
              <p className="terminal-title">mesh-router-diagnostic</p>
              <div style={{ width: 36 }} />
            </header>
            <div className="terminal-body text-xs space-y-1 py-4 px-5">
              <div><code className="terminal-prompt">&gt; GET /unknown-route</code></div>
              <div><b className="text-[#e0898d]">[404] ERR_INGRESS_ROUTE_NOT_FOUND</b></div>
              <div className="text-[var(--text-dim)]">Traefik mesh ingress could not resolve endpoint</div>
              <div className="text-[var(--text-muted)]">Cluster: aero-mesh-primary · Node: online</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="hero-actions">
          <Link href="/" className="btn-primary" id="cta-return-home">
            Return to Orbit
          </Link>
          <Link href="/pricing" className="nav-cta py-3 px-6 text-sm" id="cta-404-pricing">
            View Pricing Plans
          </Link>
          <Link href="/status" className="nav-github-link py-3 px-5 text-sm" id="cta-404-status">
            <small>System Status &rarr;</small>
          </Link>
        </div>
      </section>

      {/* ── Footer Bottom ── */}
      <footer className="relative z-10 w-full text-center py-6 text-xs text-[var(--text-dim)] border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <small className="footer-copyright">
          &copy; {new Date().getFullYear()} Aero PaaS. All systems operational.
        </small>
      </footer>
    </main>
  )
}
