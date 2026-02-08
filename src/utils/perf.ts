// Performance monitoring utilities

export function measureLoadTime(label: string) {
  const start = performance.now()
  return () => {
    const duration = performance.now() - start
    if (import.meta.env.DEV) {
      console.log(`[Perf] ${label}: ${duration.toFixed(2)}ms`)
    }
  }
}

export function reportWebVitals() {
  if (typeof window === 'undefined') return

  // Report Core Web Vitals
  if ('PerformanceObserver' in window) {
    try {
      // Largest Contentful Paint (LCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (import.meta.env.DEV) {
          console.log('[WebVitals] LCP:', lastEntry.startTime.toFixed(2), 'ms')
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true })

      // First Input Delay (FID)
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (import.meta.env.DEV) {
            console.log('[WebVitals] FID:', entry.processingStart - entry.startTime, 'ms')
          }
        })
      }).observe({ type: 'first-input', buffered: true })

      // Cumulative Layout Shift (CLS)
      let clsValue = 0
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        if (import.meta.env.DEV) {
          console.log('[WebVitals] CLS:', clsValue.toFixed(4))
        }
      }).observe({ type: 'layout-shift', buffered: true })
    } catch (e) {
      // Performance API not fully supported
    }
  }
}
