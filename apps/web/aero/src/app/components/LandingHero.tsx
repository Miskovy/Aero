'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import AeroLogo from './AeroLogo'

const Hero3DBackground = dynamic(() => import('./Hero3DBackground'), { ssr: false })

/* ── Terminal lines data ── */
const TERMINAL_LINES = [
  { type: 'prompt', text: '$ ', cmd: 'aero deploy' },
  { type: 'blank' },
  { type: 'badge', text: '  AERO  ', after: ' Deploy a service' },
  { type: 'blank' },
  { type: 'clack', bar: '  \u25C7', label: ' Select a project' },
  { type: 'clack-value', bar: '  \u2502', value: ' my-api' },
  { type: 'blank' },
  { type: 'clack', bar: '  \u25C7', label: ' Deploy from?' },
  { type: 'clack-value', bar: '  \u2502', value: ' Docker Image' },
  { type: 'blank' },
  { type: 'clack', bar: '  \u25C7', label: ' Image name' },
  { type: 'clack-value', bar: '  \u2502', value: ' node:20-alpine' },
  { type: 'blank' },
  { type: 'clack', bar: '  \u25C7', label: ' Port to expose' },
  { type: 'clack-value', bar: '  \u2502', value: ' 3000' },
  { type: 'blank' },
  { type: 'spinner', text: '  Deploying...' },
  { type: 'blank' },
  { type: 'success', bar: '  \u2714', label: ' Deployed successfully!' },
  { type: 'blank' },
  { type: 'note-border', text: '  \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510' },
  { type: 'note-line', label: '  \u2502', value: ' Service:  my-api' },
  { type: 'note-line', label: '  \u2502', value: ' Status:   running' },
  { type: 'note-line', label: '  \u2502', value: ' URL:      https://my-api.aerodeploy.app' },
  { type: 'note-border', text: '  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518' },
] as const

export default function LandingHero() {
  const [visibleLines, setVisibleLines] = useState(0)
  const [copied, setCopied] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  /* ── Terminal typing animation triggered by scroll ── */
  useEffect(() => {
    const el = terminalRef.current
    if (!el) return

    const startTyping = () => {
      hasAnimated.current = true
      let i = 0
      const interval = setInterval(() => {
        i++
        setVisibleLines(i)
        if (i >= TERMINAL_LINES.length) clearInterval(interval)
      }, 120)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          startTyping()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)

    // Replay on tab return (React works fine during tab switches)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && hasAnimated.current) {
        hasAnimated.current = false
        setVisibleLines(0)
        // Use rAF so React flushes the visibleLines=0 first
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            startTyping()
          })
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  /* ── Copy install command ── */
  const copyCmd = useCallback(() => {
    navigator.clipboard.writeText('npm install -g aerodeploy')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  return (
    <>
      {/* ── Navigation ── */}
      <nav className="nav" id="nav">
        <Link href="/" className="nav-logo" id="nav-logo">
          <AeroLogo className="nav-logo-icon" monochrome />
          <span>AERO</span>
        </Link>
        <ul className="nav-links">
          <li><a href="#features" className="nav-link" id="nav-features">Features</a></li>
          <li><a href="#pricing" className="nav-link" id="nav-pricing">Pricing</a></li>
          <li><a href="https://docs.aerodeploy.app" className="nav-link" id="nav-docs">Docs</a></li>
          <li><a href="https://discord.gg/g89G9ENMrR" className="nav-link" id="nav-discord" target="_blank" rel="noopener noreferrer">Community</a></li>
          <li><a href="https://dashboard.aerodeploy.app" className="nav-cta" id="nav-get-started">Get Started</a></li>
          <li>
            <a
              href="https://github.com/Miskovy"
              className="nav-github-link"
              id="nav-github"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="nav-github-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              <span>Miskovy</span>
            </a>
          </li>
        </ul>
      </nav>

      {/* ── Hero ── */}
      <section className="hero" id="hero">
        <Hero3DBackground />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

          {/* Headline */}
          <h1 className="hero-headline">
            Your hardware.<br />
            <em>Your cloud.</em>
          </h1>

          {/* Sub */}
          <p className="hero-sub">
            Deploy containers on any machine. Zero cloud bills. Full control over your infrastructure.
          </p>

          {/* CTA */}
          <div className="hero-actions">
            <a href="https://dashboard.aerodeploy.app" className="btn-primary" id="cta-get-started">Get Started</a>
            <button
              className="install-cmd"
              id="cta-install"
              onClick={copyCmd}
              type="button"
              aria-label="Copy install command"
            >
              <span className="install-cmd-dollar">$</span>
              <span>npm install -g aerodeploy</span>
              <span className="install-cmd-copy">{copied ? 'copied' : 'copy'}</span>
            </button>
          </div>

          {/* Trust Strip */}
          <div className="trust-strip" id="trust-strip">
            <span>Docker Powered</span>
            <span className="trust-sep">/</span>
            <span>Auto-SSL</span>
            <span className="trust-sep">/</span>
            <span>Real-Time Logs</span>
            <span className="trust-sep">/</span>
            <span>Secrets Vault</span>
            <span className="trust-sep">/</span>
            <span>Zero Config</span>
          </div>

          {/* Terminal Mockup */}
          <div className="terminal-section" ref={terminalRef}>
            <div className="terminal" id="terminal-demo">
              <div className="terminal-header">
                <div className="terminal-dot" />
                <div className="terminal-dot" />
                <div className="terminal-dot" />
                <span className="terminal-title">aero</span>
                <div style={{ width: 36 }} />
              </div>
              <div className="terminal-body" style={{ minHeight: '560px' }}>
                {TERMINAL_LINES.map((line, i) => {
                  if (i >= visibleLines) return null
                  const delay = `${i * 0.06}s`

                  if (line.type === 'blank') {
                    return <div key={i} className="terminal-line" style={{ animationDelay: delay, height: '0.5em' }} />
                  }

                  if (line.type === 'prompt') {
                    return (
                      <div key={i} className="terminal-line" style={{ animationDelay: delay }}>
                        <span className="terminal-prompt">{line.text}</span>
                        <span className="terminal-cmd">{line.cmd}</span>
                      </div>
                    )
                  }

                  if (line.type === 'badge') {
                    return (
                      <div key={i} className="terminal-line" style={{ animationDelay: delay }}>
                        <span className="terminal-badge">{line.text}</span>
                        <span className="terminal-dim">{line.after}</span>
                      </div>
                    )
                  }

                  if (line.type === 'clack') {
                    return (
                      <div key={i} className="terminal-line" style={{ animationDelay: delay }}>
                        <span className="terminal-clack-bar">{line.bar}</span>
                        <span className="terminal-clack-label">{line.label}</span>
                      </div>
                    )
                  }

                  if (line.type === 'clack-value') {
                    return (
                      <div key={i} className="terminal-line" style={{ animationDelay: delay }}>
                        <span className="terminal-clack-bar">{line.bar}</span>
                        <span className="terminal-clack-value">{line.value}</span>
                      </div>
                    )
                  }

                  if (line.type === 'spinner') {
                    return (
                      <div key={i} className="terminal-line" style={{ animationDelay: delay }}>
                        <span className="terminal-dim">{line.text}</span>
                      </div>
                    )
                  }

                  if (line.type === 'success') {
                    return (
                      <div key={i} className="terminal-line" style={{ animationDelay: delay }}>
                        <span className="terminal-success">{line.bar}</span>
                        <span className="terminal-success">{line.label}</span>
                      </div>
                    )
                  }

                  if (line.type === 'note-border') {
                    return (
                      <div key={i} className="terminal-line" style={{ animationDelay: delay }}>
                        <span className="terminal-clack-bar">{line.text}</span>
                      </div>
                    )
                  }

                  if (line.type === 'note-line') {
                    return (
                      <div key={i} className="terminal-line" style={{ animationDelay: delay }}>
                        <span className="terminal-clack-bar">{line.label}</span>
                        <span className="terminal-clack-value">{line.value}</span>
                      </div>
                    )
                  }

                  return null
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}


