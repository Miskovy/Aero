'use client'

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Reveal an element when it scrolls into view using IntersectionObserver.
 * Adds the `visible` class to trigger CSS transition animations.
 *
 * On tab return (visibilitychange), removes and re-adds the class
 * to replay the CSS transition. Back-navigation is handled by a
 * hard reload in layout.tsx.
 */
export function useRevealOnReturn<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let hasPlayed = false

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          hasPlayed = true
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(el)

    // Replay on tab return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && hasPlayed) {
        el.classList.remove('visible')
        hasPlayed = false
        // Use setTimeout to guarantee the browser paints the removal
        // before we re-add the class (rAF alone isn't reliable here)
        setTimeout(() => {
          const rect = el.getBoundingClientRect()
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            el.classList.add('visible')
            hasPlayed = true
          }
          // If off-screen, the IntersectionObserver will handle it on scroll
        }, 50)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return ref
}
